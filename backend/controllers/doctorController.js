const asyncHandler = require("express-async-handler");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { getIO, patientRoom } = require("../socket");
const { dateToLocalYMD, generateSlotStarts } = require("../utils/scheduling");

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateWeeklyHours(weeklyHours) {
  if (!Array.isArray(weeklyHours) || weeklyHours.length !== 7) {
    return "weeklyHours must have exactly 7 entries (one per weekday)";
  }
  const seenDays = new Set();
  for (const entry of weeklyHours) {
    if (
      typeof entry.day !== "number" ||
      entry.day < 0 ||
      entry.day > 6 ||
      seenDays.has(entry.day)
    ) {
      return "Each weekday (0-6) must appear exactly once";
    }
    seenDays.add(entry.day);

    if (!entry.isWorking) continue;

    if (!TIME_RE.test(entry.startTime) || !TIME_RE.test(entry.endTime)) {
      return `Day ${entry.day}: startTime/endTime must be in HH:mm format`;
    }
    if (entry.startTime >= entry.endTime) {
      return `Day ${entry.day}: start time must be before end time`;
    }
    const hasBreak = entry.breakStart || entry.breakEnd;
    if (hasBreak) {
      if (!TIME_RE.test(entry.breakStart) || !TIME_RE.test(entry.breakEnd)) {
        return `Day ${entry.day}: break start/end must both be in HH:mm format`;
      }
      if (entry.breakStart >= entry.breakEnd) {
        return `Day ${entry.day}: break start must be before break end`;
      }
      if (entry.breakStart < entry.startTime || entry.breakEnd > entry.endTime) {
        return `Day ${entry.day}: break must fall within working hours`;
      }
    }
  }
  return null;
}

async function getOwnDoctorProfile(req) {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    const err = new Error("Doctor profile not found");
    err.statusCode = 404;
    throw err;
  }
  return doctor;
}

// GET /doctors/me/schedule
const getMySchedule = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  res.json({ success: true, schedule: doctor.schedule });
});

// PATCH /doctors/me/schedule
// This is what makes booking realistic: the doctor decides which days
// they work, their hours, their break/lunch window, how long each patient
// visit takes, and which specific dates they're on holiday. Everything
// the patient can book flows from this.
//
// Real-world wrinkle: a doctor might tighten their hours or add a holiday
// *after* patients have already booked slots that no longer fit. Rather
// than silently orphaning those appointments (or silently keeping the old
// schedule), this checks upcoming appointments against the proposed
// schedule first. If any conflict, it reports them and requires the
// doctor to explicitly confirm before it saves the change and cancels
// those appointments (notifying the affected patients).
const updateMySchedule = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const { slotDurationMinutes, weeklyHours, holidays, confirmCancellations } =
    req.body;

  const proposed = {
    slotDurationMinutes: doctor.schedule.slotDurationMinutes,
    weeklyHours: doctor.schedule.weeklyHours,
    holidays: doctor.schedule.holidays,
  };

  if (slotDurationMinutes !== undefined) {
    const dur = Number(slotDurationMinutes);
    if (!Number.isFinite(dur) || dur < 5 || dur > 180) {
      res.status(400);
      throw new Error(
        "Minutes per patient must be a number between 5 and 180",
      );
    }
    proposed.slotDurationMinutes = dur;
  }

  if (weeklyHours !== undefined) {
    const error = validateWeeklyHours(weeklyHours);
    if (error) {
      res.status(400);
      throw new Error(error);
    }
    proposed.weeklyHours = weeklyHours;
  }

  if (holidays !== undefined) {
    if (!Array.isArray(holidays)) {
      res.status(400);
      throw new Error("holidays must be an array of dates");
    }
    const parsed = holidays.map((h) => new Date(h));
    if (parsed.some((d) => Number.isNaN(d.getTime()))) {
      res.status(400);
      throw new Error("One or more holiday dates is invalid");
    }
    const uniqueByDay = new Map();
    parsed.forEach((d) => uniqueByDay.set(dateToLocalYMD(d), d));
    proposed.holidays = Array.from(uniqueByDay.values());
  }

  // Find this doctor's upcoming active appointments that would no longer
  // be a valid slot under the proposed schedule.
  const upcoming = await Appointment.find({
    doctor: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    requestedDate: { $gte: new Date() },
  }).populate({ path: "patient", populate: { path: "user", select: "name email" } });

  const proposedDoctor = { schedule: proposed };
  const conflicts = upcoming.filter((appt) => {
    const dateStr = dateToLocalYMD(appt.requestedDate);
    const validStarts = generateSlotStarts(proposedDoctor, dateStr);
    return !validStarts.some(
      (s) => s.getTime() === new Date(appt.requestedDate).getTime(),
    );
  });

  if (conflicts.length > 0 && !confirmCancellations) {
    res.status(409);
    res.json({
      success: false,
      requiresConfirmation: true,
      message: `${conflicts.length} upcoming appointment${conflicts.length === 1 ? "" : "s"} would fall outside these hours. Confirm to cancel ${conflicts.length === 1 ? "it" : "them"} and notify the patient${conflicts.length === 1 ? "" : "s"}, or adjust your changes instead.`,
      conflicts: conflicts.map((c) => ({
        id: c._id,
        patientName: c.patient?.user?.name || "Unknown patient",
        requestedDate: c.requestedDate,
      })),
    });
    return;
  }

  doctor.schedule.slotDurationMinutes = proposed.slotDurationMinutes;
  doctor.schedule.weeklyHours = proposed.weeklyHours;
  doctor.schedule.holidays = proposed.holidays;
  await doctor.save();

  if (conflicts.length > 0) {
    await Appointment.updateMany(
      { _id: { $in: conflicts.map((c) => c._id) } },
      {
        status: "cancelled",
        cancellationReason:
          "Cancelled automatically: the doctor updated their schedule and this time is no longer available.",
      },
    );

    conflicts.forEach((appt) => {
      const patientUser = appt.patient?.user;
      const when = new Date(appt.requestedDate).toLocaleString();

      if (patientUser?.email) {
        sendEmail({
          to: patientUser.email,
          subject: "Your appointment was cancelled — doctor's schedule changed",
          text: `Dr. ${req.user.name} updated their schedule and your appointment on ${when} is no longer available. Please log in and book a new slot.`,
          html: `<p>Dr. ${req.user.name} updated their schedule and your appointment on <strong>${when}</strong> is no longer available.</p><p>Please log in and book a new slot that fits the new hours.</p>`,
        }).catch(() => {});
      }

      if (appt.patient?._id) {
        getIO()
          ?.to(patientRoom(appt.patient._id))
          .emit("appointment:cancelled", {
            appointmentId: appt._id,
            reason: "schedule_changed",
            requestedDate: appt.requestedDate,
          });
      }
    });
  }

  res.json({
    success: true,
    schedule: doctor.schedule,
    cancelledCount: conflicts.length,
  });
});

const findPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    patientId: req.params.patientId,
  }).populate("user", "name email phone");
  if (!patient) {
    res.status(404);
    throw new Error("No patient found with that Patient ID");
  }
  res.json({ success: true, patient });
});

const getPatientHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ patientId: req.params.patientId });
  if (!patient) {
    res.status(404);
    throw new Error("No patient found with that Patient ID");
  }

  const records = await MedicalRecord.find({ patient: patient._id })
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ visitDate: -1 });

  res.json({ success: true, patient, count: records.length, records });
});

const addMedicalRecord = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const patient = await Patient.findOne({ patientId: req.params.patientId });
  if (!patient) {
    res.status(404);
    throw new Error("No patient found with that Patient ID");
  }

  const { diagnosis, notes, symptoms, medicines, visitDate } = req.body;

  const record = await MedicalRecord.create({
    patient: patient._id,
    doctor: doctor._id,
    diagnosis,
    notes,
    symptoms,
    medicines,
    visitDate: visitDate || Date.now(),
  });

  res.status(201).json({ success: true, record });
});

const addAttachment = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const record = await MedicalRecord.findOne({
    _id: req.params.recordId,
    doctor: doctor._id,
  });

  if (!record) {
    res.status(404);
    throw new Error("Record not found or does not belong to you");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  record.attachments.push({
    type: req.body.type || "other",
    fileName: req.file.originalname,
    url: req.file.path,
    publicId: req.file.filename,
  });

  await record.save();
  res.status(201).json({ success: true, record });
});

const getMyAppointments = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const filter = { doctor: doctor._id };
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .populate({ path: "patient", populate: { path: "user", select: "name" } })
    .populate({ path: "resultingRecord", select: "diagnosis visitDate" })
    .sort({ requestedDate: 1 });

  res.json({ success: true, count: appointments.length, appointments });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    doctor: doctor._id,
  });

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }

  const { status, confirmedDate, cancellationReason } = req.body;
  const validTransitions = ["confirmed", "completed", "cancelled"];
  if (!validTransitions.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validTransitions.join(", ")}`);
  }

  appointment.status = status;
  if (status === "confirmed") {
    // Default to the patient's requested slot; the doctor can still pass
    // a different confirmedDate to reschedule within the same request.
    appointment.confirmedDate = confirmedDate || appointment.requestedDate;
  } else if (confirmedDate) {
    appointment.confirmedDate = confirmedDate;
  }
  if (status === "cancelled")
    appointment.cancellationReason = cancellationReason;

  await appointment.save();
  res.json({ success: true, appointment });
});

const getAppointmentPatientProfile = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    doctor: doctor._id,
  }).populate({
    path: "patient",
    populate: { path: "user", select: "name email phone avatarUrl" },
  });

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }

  const history = await MedicalRecord.find({ patient: appointment.patient._id })
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ visitDate: -1 });

  res.json({
    success: true,
    appointment,
    patient: appointment.patient,
    history,
  });
});

const prescribeForAppointment = asyncHandler(async (req, res) => {
  const doctor = await getOwnDoctorProfile(req);
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    doctor: doctor._id,
  });

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (appointment.status === "cancelled") {
    res.status(400);
    throw new Error("Cannot prescribe against a cancelled appointment");
  }

  const { diagnosis, notes, symptoms, medicines, visitDate } = req.body;

  const record = await MedicalRecord.create({
    patient: appointment.patient,
    doctor: doctor._id,
    diagnosis,
    notes,
    symptoms,
    medicines,
    visitDate: visitDate || Date.now(),
  });

  appointment.resultingRecord = record._id;
  appointment.status = "completed";
  await appointment.save();

  res.status(201).json({ success: true, record, appointment });
});

const updatePatientMedicalInfo = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ patientId: req.params.patientId });
  if (!patient) {
    res.status(404);
    throw new Error("No patient found with that Patient ID");
  }

  const allowed = ["allergies", "chronicConditions", "bloodGroup"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) patient[field] = req.body[field];
  });

  await patient.save();
  res.json({ success: true, patient });
});

const contactAdmin = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const admins = await User.find({ role: "admin", isActive: true }).select(
    "email name",
  );
  if (admins.length === 0) {
    res.status(500);
    throw new Error("No admin account is configured to receive messages");
  }

  const finalSubject = subject?.trim() || "Message from a doctor";
  const text = `You have a new message from a doctor.\n\nFrom: ${req.user.name} <${req.user.email}>\n\n${message}`;
  const html = `
    <p>You have a new message from a doctor.</p>
    <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
    <p><strong>Message:</strong></p>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;

  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `[Health Platform] ${finalSubject}`,
        text,
        html,
      }),
    ),
  );

  res
    .status(201)
    .json({
      success: true,
      message: "Your message was sent to the admin team.",
    });
});

module.exports = {
  getMySchedule,
  updateMySchedule,
  findPatientById,
  getPatientHistory,
  addMedicalRecord,
  addAttachment,
  getMyAppointments,
  updateAppointmentStatus,
  getAppointmentPatientProfile,
  prescribeForAppointment,
  updatePatientMedicalInfo,
  contactAdmin,
};
