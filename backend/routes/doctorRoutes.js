const express = require("express");
const {
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
} = require("../controllers/doctorController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(protect, authorize("doctor"));

router.get("/patients/:patientId", findPatientById);
router.get("/patients/:patientId/records", getPatientHistory);
router.post("/patients/:patientId/records", addMedicalRecord);
router.patch("/patients/:patientId/medical-info", updatePatientMedicalInfo);
router.post("/records/:recordId/attachments", upload.single("file"), addAttachment);

router.get("/me/appointments", getMyAppointments);
router.patch("/me/appointments/:id", updateAppointmentStatus);
router.get("/me/appointments/:id/patient", getAppointmentPatientProfile);
router.post("/me/appointments/:id/prescribe", prescribeForAppointment);
router.post("/me/contact-admin", contactAdmin);

module.exports = router;
