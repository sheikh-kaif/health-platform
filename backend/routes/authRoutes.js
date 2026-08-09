const express = require("express");
const {
  registerPatient,
  registerDoctor,
  registerAmbulanceDriver,
  login,
  googleAuth,
  getMe,
  updateMe,
  uploadAvatar,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/register/patient", registerPatient);
router.post("/register/doctor", registerDoctor);
router.post("/register/ambulance", registerAmbulanceDriver);
router.post("/login", login);
router.post("/google", googleAuth);

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.post("/avatar", protect, upload.uploadAvatar.single("photo"), uploadAvatar);

router.put("/change-password", protect, changePassword);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

module.exports = router;
