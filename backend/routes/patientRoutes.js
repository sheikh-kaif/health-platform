const express = require("express");
const {
  getMyRecords,
  getMyRecordById,
  updateMyProfile,
  listDoctors,
  bookAppointment,
  getMyAppointments,
  cancelMyAppointment,
  contactAdmin,
  bookAmbulance,
  getMyAmbulanceRequests,
  cancelAmbulanceRequest,
} = require("../controllers/patientController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("patient"));

router.get("/me/records", getMyRecords);
router.get("/me/records/:id", getMyRecordById);
router.put("/me", updateMyProfile);
router.get("/doctors", listDoctors);
router.post("/me/appointments", bookAppointment);
router.get("/me/appointments", getMyAppointments);
router.patch("/me/appointments/:id/cancel", cancelMyAppointment);
router.post("/me/contact-admin", contactAdmin);
router.post("/me/ambulance-requests", bookAmbulance);
router.get("/me/ambulance-requests", getMyAmbulanceRequests);
router.patch("/me/ambulance-requests/:id/cancel", cancelAmbulanceRequest);

module.exports = router;
