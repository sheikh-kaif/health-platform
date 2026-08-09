const express = require("express");
const {
  listRequests,
  listMyRequests,
  acceptRequest,
  completeRequest,
  setAvailability,
  contactAdmin,
} = require("../controllers/ambulanceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("ambulance_driver"));

router.get("/requests", listRequests);
router.get("/requests/mine", listMyRequests);
router.patch("/requests/:id/accept", acceptRequest);
router.patch("/requests/:id/complete", completeRequest);
router.patch("/me/availability", setAvailability);
router.post("/me/contact-admin", contactAdmin);

module.exports = router;
