const asyncHandler = require("express-async-handler");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

async function getOwnDoctorProfile(req) {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    const err = new Error("Doctor profile not found");
    err.statusCode = 404;
    throw err;
  }
  return doctor;
}

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
  if (confirmedDate) appointment.confirmedDate = confirmedDate;
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
