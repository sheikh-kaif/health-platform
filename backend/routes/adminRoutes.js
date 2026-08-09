const express = require("express");
const {
  listDoctors,
  verifyDoctor,
  listUsers,
  setUserActiveStatus,
  getOverview,
  getCommonDiseases,
  getDiseaseTrends,
  getTopMedicines,
  getDoctorActivity,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/doctors", listDoctors);
router.patch("/doctors/:id/verify", verifyDoctor);

router.get("/users", listUsers);
router.patch("/users/:id/status", setUserActiveStatus);

router.get("/analytics/overview", getOverview);
router.get("/analytics/common-diseases", getCommonDiseases);
router.get("/analytics/disease-trends", getDiseaseTrends);
router.get("/analytics/top-medicines", getTopMedicines);
router.get("/analytics/doctor-activity", getDoctorActivity);

module.exports = router;
