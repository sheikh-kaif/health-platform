const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");

// ---------- Doctor verification ----------

const listDoctors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;

  const doctors = await Doctor.find(filter).populate(
    "user",
    "name email phone isActive",
  );
  res.json({ success: true, count: doctors.length, doctors });
});

const verifyDoctor = asyncHandler(async (req, res) => {
  const { decision, rejectionReason } = req.body; // decision: "verified" | "rejected"
  if (!["verified", "rejected"].includes(decision)) {
    res.status(400);
    throw new Error('decision must be "verified" or "rejected"');
  }

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  doctor.verificationStatus = decision;
  doctor.verifiedBy = req.user._id;
  doctor.verifiedAt = new Date();
  if (decision === "rejected") doctor.rejectionReason = rejectionReason;

  await doctor.save();
  res.json({ success: true, doctor });
});

// ---------- User management ----------

const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;

  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

const setUserActiveStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isActive = !!isActive;
  await user.save();
  res.json({ success: true, user: { id: user._id, isActive: user.isActive } });
});

// ---------- Analytics ----------

const getOverview = asyncHandler(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    verifiedDoctors,
    pendingDoctors,
    totalRecords,
    totalAppointments,
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ verificationStatus: "verified" }),
    Doctor.countDocuments({ verificationStatus: "pending" }),
    MedicalRecord.countDocuments(),
    Appointment.countDocuments(),
  ]);

  res.json({
    success: true,
    overview: {
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalRecords,
      totalAppointments,
    },
  });
});

const getCommonDiseases = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const results = await MedicalRecord.aggregate([
    { $group: { _id: "$diagnosis", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, diagnosis: "$_id", count: 1 } },
  ]);

  res.json({ success: true, results });
});

const getDiseaseTrends = asyncHandler(async (req, res) => {
  const byGender = await MedicalRecord.aggregate([
    {
      $lookup: {
        from: "patients",
        localField: "patient",
        foreignField: "_id",
        as: "patientInfo",
      },
    },
    { $unwind: "$patientInfo" },
    {
      $group: {
        _id: { diagnosis: "$diagnosis", gender: "$patientInfo.gender" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        diagnosis: "$_id.diagnosis",
        gender: "$_id.gender",
        count: 1,
      },
    },
  ]);

  const byLocation = await MedicalRecord.aggregate([
    {
      $lookup: {
        from: "patients",
        localField: "patient",
        foreignField: "_id",
        as: "patientInfo",
      },
    },
    { $unwind: "$patientInfo" },
    {
      $group: {
        _id: { diagnosis: "$diagnosis", state: "$patientInfo.location.state" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        diagnosis: "$_id.diagnosis",
        state: "$_id.state",
        count: 1,
      },
    },
  ]);

  const byAge = await MedicalRecord.aggregate([
    {
      $lookup: {
        from: "patients",
        localField: "patient",
        foreignField: "_id",
        as: "patientInfo",
      },
    },
    { $unwind: "$patientInfo" },
    {
      $addFields: {
        ageYears: {
          $dateDiff: {
            startDate: "$patientInfo.dob",
            endDate: "$$NOW",
            unit: "year",
          },
        },
      },
    },
    {
      $addFields: {
        ageGroup: {
          $switch: {
            branches: [
              { case: { $lt: ["$ageYears", 18] }, then: "0-17" },
              { case: { $lt: ["$ageYears", 35] }, then: "18-34" },
              { case: { $lt: ["$ageYears", 50] }, then: "35-49" },
              { case: { $lt: ["$ageYears", 65] }, then: "50-64" },
            ],
            default: "65+",
          },
        },
      },
    },
    {
      $group: {
        _id: { diagnosis: "$diagnosis", ageGroup: "$ageGroup" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        diagnosis: "$_id.diagnosis",
        ageGroup: "$_id.ageGroup",
        count: 1,
      },
    },
  ]);

  res.json({ success: true, trends: { byGender, byLocation, byAge } });
});

const getTopMedicines = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const results = await MedicalRecord.aggregate([
    { $unwind: "$medicines" },
    { $group: { _id: "$medicines.name", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, medicine: "$_id", count: 1 } },
  ]);

  res.json({ success: true, results });
});

const getDoctorActivity = asyncHandler(async (req, res) => {
  const results = await MedicalRecord.aggregate([
    {
      $group: {
        _id: "$doctor",
        recordsAdded: { $sum: 1 },
        uniquePatients: { $addToSet: "$patient" },
      },
    },
    {
      $lookup: {
        from: "doctors",
        localField: "_id",
        foreignField: "_id",
        as: "doctorInfo",
      },
    },
    { $unwind: "$doctorInfo" },
    {
      $lookup: {
        from: "users",
        localField: "doctorInfo.user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        doctorId: "$_id",
        name: "$userInfo.name",
        specialization: "$doctorInfo.specialization",
        recordsAdded: 1,
        patientsTreated: { $size: "$uniquePatients" },
      },
    },
    { $sort: { patientsTreated: -1 } },
  ]);

  res.json({ success: true, results });
});

module.exports = {
  listDoctors,
  verifyDoctor,
  listUsers,
  setUserActiveStatus,
  getOverview,
  getCommonDiseases,
  getDiseaseTrends,
  getTopMedicines,
  getDoctorActivity,
};
