const asyncHandler = require("express-async-handler");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const AmbulanceRequest = require("../models/AmbulanceRequest");
const sendEmail = require("../utils/sendEmail");
const { getIO, patientRoom } = require("../socket");
const {
  dateToLocalYMD,
  isValidDateStr,
  getAvailability,
  isBookableSlot,
} = require("../utils/scheduling");

async function getOwnPatientProfile(req) {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    const err = new Error("Patient profile not found");
    err.statusCode = 404;
    throw err;
  }
  return patient;
}

const getMyRecords = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const records = await MedicalRecord.find({ patient: patient._id })
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ visitDate: -1 });

  res.json({ success: true, count: records.length, records });
});

const getMyRecordById = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const record = await MedicalRecord.findOne({
    _id: req.params.id,
    patient: patient._id,
  }).populate({ path: "doctor", populate: { path: "user", select: "name" } });

  if (!record) {
    res.status(404);
    throw new Error("Record not found");
  }

  res.json({ success: true, record });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const allowed = ["address", "emergencyContact"];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) patient[field] = req.body[field];
  });

  await patient.save();
  res.json({ success: true, profile: patient });
});

const listDoctors = asyncHandler(async (req, res) => {
  const filter = { verificationStatus: "verified" };
  if (req.query.specialization)
    filter.specialization = req.query.specialization;

  const doctors = await Doctor.find(filter).populate("user", "name email");
  res.json({ success: true, count: doctors.length, doctors });
});

// GET /patients/doctors/:doctorId/availability?date=YYYY-MM-DD
// Returns the doctor's real bookable slots for one day: their working
// hours broken into slots of their configured duration, with slots
// already taken by another patient, in the past, or falling in a break
// marked unavailable. Doctor holidays / non-working days return no slots.
const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const dateStr = req.query.date;

  if (!dateStr || !isValidDateStr(dateStr)) {
    res.status(400);
    throw new Error("A valid date (YYYY-MM-DD) is required");
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    verificationStatus: "verified",
  });
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found or not yet verified");
  }

  const dayStart = new Date(dateStr + "T00:00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const existing = await Appointment.find({
    doctor: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    requestedDate: { $gte: dayStart, $lt: dayEnd },
  }).select("requestedDate");

  const { slots, slotDurationMinutes, reason } = getAvailability(
    doctor,
    dateStr,
    existing.map((a) => a.requestedDate),
  );

  res.json({
    success: true,
    date: dateStr,
    slotDurationMinutes,
    unavailableReason: reason, // "holiday" | "not_working" | null
    slots: slots.map((s) => ({
      time: s.start.toISOString(),
      label: s.label,
      available: s.available,
      status: s.status,
    })),
  });
});

const bookAppointment = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const { doctorId, requestedDate, reason } = req.body;

  const doctor = await Doctor.findOne({
    _id: doctorId,
    verificationStatus: "verified",
  });
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found or not yet verified");
  }

  if (!requestedDate) {
    res.status(400);
    throw new Error("Please choose an available appointment slot");
  }

  const slotDate = new Date(requestedDate);
  if (Number.isNaN(slotDate.getTime())) {
    res.status(400);
    throw new Error("Invalid appointment time");
  }
  if (slotDate.getTime() < Date.now()) {
    res.status(400);
    throw new Error("You can't book a slot in the past");
  }

  const dateStr = dateToLocalYMD(slotDate);
  const dayStart = new Date(dateStr + "T00:00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existing = await Appointment.find({
    doctor: doctor._id,
    status: { $in: ["pending", "confirmed"] },
    requestedDate: { $gte: dayStart, $lt: dayEnd },
  }).select("requestedDate");

  const bookable = isBookableSlot(
    doctor,
    slotDate,
    existing.map((a) => a.requestedDate),
  );
  if (!bookable) {
    res.status(409);
    throw new Error(
      "That slot isn't available anymore (it may be outside the doctor's hours, on a holiday, or already booked). Please pick another slot.",
    );
  }

  try {
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      requestedDate: slotDate,
      reason,
    });
    res.status(201).json({ success: true, appointment });
  } catch (err) {
    // Unique partial index catches the rare race where two requests for
    // the same slot land at (almost) the same time.
    if (err.code === 11000) {
      res.status(409);
      throw new Error(
        "Someone just booked that slot. Please pick another one.",
      );
    }
    throw err;
  }
});

const getMyAppointments = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const appointments = await Appointment.find({ patient: patient._id })
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ requestedDate: -1 });

  res.json({ success: true, count: appointments.length, appointments });
});

const cancelMyAppointment = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    patient: patient._id,
  });

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    res.status(400);
    throw new Error(
      `Cannot cancel an appointment that is already ${appointment.status}`,
    );
  }

  appointment.status = "cancelled";
  appointment.cancellationReason = req.body.reason || "Cancelled by patient";
  await appointment.save();

  res.json({ success: true, appointment });
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

  const finalSubject = subject?.trim() || "Message from a patient";
  const text = `You have a new message from a patient.\n\nFrom: ${req.user.name} <${req.user.email}>\n\n${message}`;
  const html = `
    <p>You have a new message from a patient.</p>
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

const bookAmbulance = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const { pickupAddress, contactPhone, notes, pickupLocation } = req.body;

  if (!pickupAddress?.trim() || !contactPhone?.trim()) {
    res.status(400);
    throw new Error("Pickup address and a contact phone number are required");
  }

  const hasValidLocation =
    pickupLocation &&
    typeof pickupLocation.lat === "number" &&
    typeof pickupLocation.lng === "number";

  const request = await AmbulanceRequest.create({
    patient: patient._id,
    pickupAddress,
    contactPhone,
    notes,
    pickupLocation: hasValidLocation ? pickupLocation : undefined,
  });

  const populated = await request.populate({
    path: "patient",
    populate: { path: "user", select: "name" },
  });
  getIO()?.to("drivers").emit("ambulance:new-request", populated);

  res.status(201).json({ success: true, request });
});

const getMyAmbulanceRequests = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const requests = await AmbulanceRequest.find({ patient: patient._id })
    .populate({
      path: "driver",
      populate: { path: "user", select: "name phone" },
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, count: requests.length, requests });
});

const cancelAmbulanceRequest = asyncHandler(async (req, res) => {
  const patient = await getOwnPatientProfile(req);
  const request = await AmbulanceRequest.findOneAndUpdate(
    { _id: req.params.id, patient: patient._id, status: "pending" },
    {
      status: "cancelled",
      cancellationReason: req.body.reason || "Cancelled by patient",
    },
    { new: true },
  );

  if (!request) {
    res.status(400);
    throw new Error(
      "Only a pending request (not yet accepted) can be cancelled",
    );
  }

  getIO()
    ?.to("drivers")
    .emit("ambulance:request-taken", { requestId: request._id });

  res.json({ success: true, request });
});

module.exports = {
  getMyRecords,
  getMyRecordById,
  updateMyProfile,
  listDoctors,
  getDoctorAvailability,
  bookAppointment,
  getMyAppointments,
  cancelMyAppointment,
  contactAdmin,
  bookAmbulance,
  getMyAmbulanceRequests,
  cancelAmbulanceRequest,
};
