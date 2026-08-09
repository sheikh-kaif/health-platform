const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Ambulance = require("../models/Ambulance");
const generateToken = require("../utils/generateToken");
const generatePatientId = require("../utils/generatePatientId");
const sendEmail = require("../utils/sendEmail");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl || null,
    isEmailVerified: user.isEmailVerified,
    authProvider: user.authProvider,
  };
}

async function sendVerificationEmail(user) {
  const rawToken = user.createToken(
    "emailVerificationToken",
    "emailVerificationExpires",
    60 * 24, // 24 hours
  );
  await user.save({ validateBeforeSave: false });

  const link = `${CLIENT_URL}/verify-email/${rawToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your email — Health Platform",
      text: `Hi ${user.name},\n\nPlease verify your email by visiting:\n${link}\n\nThis link expires in 24 hours.`,
      html: `<p>Hi ${user.name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err.message);
  }
}

const registerPatient = asyncHandler(async (req, res) => {
  const { name, email, password, phone, dob, gender, city, state } = req.body;

  if (
    !name?.trim() ||
    !email?.trim() ||
    !password ||
    !phone?.trim() ||
    !dob ||
    !gender ||
    !city?.trim() ||
    !state?.trim()
  ) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "patient",
  });

  let patientId;
  let unique = false;

  while (!unique) {
    patientId = generatePatientId();
    unique = !(await Patient.findOne({ patientId }));
  }

  const patient = await Patient.create({
    user: user._id,
    patientId,
    dob,
    gender,
    location: { city, state },
  });

  sendVerificationEmail(user).catch(() => {});

  res.status(201).json({
    success: true,
    token: generateToken(user),
    user: serializeUser(user),
    profile: patient,
  });
});

const registerDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    registrationNumber,
    specialization,
    qualification,
    yearsOfExperience,
    hospital,
    city,
    state,
  } = req.body;

  if (
    !name?.trim() ||
    !email?.trim() ||
    !password ||
    !phone?.trim() ||
    !registrationNumber?.trim() ||
    !specialization?.trim() ||
    !qualification?.trim() ||
    !yearsOfExperience ||
    !hospital?.trim() ||
    !city?.trim() ||
    !state?.trim()
  ) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const regExists = await Doctor.findOne({ registrationNumber });
  if (regExists) {
    res.status(409);
    throw new Error("This medical registration number is already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "doctor",
  });

  const doctor = await Doctor.create({
    user: user._id,
    registrationNumber,
    specialization,
    qualification,
    yearsOfExperience,
    hospital,
    location: { city, state },
    verificationStatus: "pending",
  });

  sendVerificationEmail(user).catch(() => {});

  res.status(201).json({
    success: true,
    message:
      "Registration submitted. Your account will be enabled once an admin verifies your registration number.",
    user: serializeUser(user),
    profile: doctor,
  });
});

const registerAmbulanceDriver = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    licenseNumber,
    vehicleNumber,
    vehicleType,
    city,
    state,
  } = req.body;

  if (
    !name?.trim() ||
    !email?.trim() ||
    !password ||
    !phone?.trim() ||
    !licenseNumber?.trim() ||
    !vehicleNumber?.trim() ||
    !vehicleType?.trim() ||
    !city?.trim() ||
    !state?.trim()
  ) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "ambulance_driver",
  });

  const driver = await Ambulance.create({
    user: user._id,
    licenseNumber,
    vehicleNumber,
    vehicleType,
    location: { city, state },
  });

  sendVerificationEmail(user).catch(() => {});

  res.status(201).json({
    success: true,
    token: generateToken(user),
    user: serializeUser(user),
    profile: driver,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.password) {
    res.status(401);
    throw new Error(
      "This account uses Google Sign-In. Continue with Google to log in.",
    );
  }

  if (!(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error(
      "This account has been disabled. Contact an administrator.",
    );
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: user._id });
    if (doctor && doctor.verificationStatus !== "verified") {
      res.status(403);
      throw new Error(
        `Your registration is ${doctor.verificationStatus}. You cannot log in until an admin verifies it.`,
      );
    }
  }

  res.json({
    success: true,
    token: generateToken(user),
    user: serializeUser(user),
  });
});

const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!googleClient) {
    res.status(500);
    throw new Error("Google Sign-In is not configured on this server");
  }
  if (!credential) {
    res.status(400);
    throw new Error("Missing Google credential");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    res.status(401);
    throw new Error("Invalid Google credential");
  }

  if (!payload?.email) {
    res.status(401);
    throw new Error("Google account has no verified email");
  }

  let user = await User.findOne({ email: payload.email.toLowerCase() }).select(
    "+password",
  );

  if (user) {
    if (!user.isActive) {
      res.status(403);
      throw new Error(
        "This account has been disabled. Contact an administrator.",
      );
    }

    if (!user.googleId) {
      user.googleId = payload.sub;
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      await user.save();
    }
  } else {
    user = await User.create({
      name: payload.name || payload.email.split("@")[0],
      email: payload.email,
      role: "patient",
      authProvider: "google",
      googleId: payload.sub,
      isEmailVerified: !!payload.email_verified,
      avatarUrl: payload.picture,
    });

    let patientId;
    let unique = false;
    while (!unique) {
      patientId = generatePatientId();
      unique = !(await Patient.findOne({ patientId }));
    }
    await Patient.create({ user: user._id, patientId });
  }

  res.json({
    success: true,
    token: generateToken(user),
    user: serializeUser(user),
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  let profile = null;

  if (user.role === "patient") {
    profile = await Patient.findOne({ user: user._id });
  } else if (user.role === "doctor") {
    profile = await Doctor.findOne({ user: user._id });
  } else if (user.role === "ambulance_driver") {
    profile = await Ambulance.findOne({ user: user._id });
  }

  res.json({
    success: true,
    user: serializeUser(user),
    profile,
  });
});

// const updateMe = asyncHandler(async (req, res) => {
//   const user = req.user;
//   const { name, phone } = req.body;

//   if (name !== undefined) user.name = name;
//   if (phone !== undefined) user.phone = phone;

//   await user.save();
//   res.json({ success: true, user: serializeUser(user) });
// });
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.json({
    success: true,
    user: serializeUser(user),
  });
});

// const uploadAvatar = asyncHandler(async (req, res) => {
//   if (!req.file) {
//     res.status(400);
//     throw new Error("No image uploaded");
//   }

//   const user = req.user;
//   user.avatarUrl = req.file.path; // Cloudinary URL from multer-storage-cloudinary
//   user.avatarPublicId = req.file.filename;
//   await user.save();

//   res.json({ success: true, user: serializeUser(user) });
// });
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image uploaded");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      avatarUrl: req.file.path,
      avatarPublicId: req.file.filename,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.json({
    success: true,
    user: serializeUser(user),
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("currentPassword and newPassword are required");
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  const genericResponse = {
    success: true,
    message:
      "If an account with that email exists, a reset link has been sent.",
  };

  if (!user) {
    res.json(genericResponse);
    return;
  }

  const rawToken = user.createToken(
    "resetPasswordToken",
    "resetPasswordExpires",
    30,
  );
  await user.save({ validateBeforeSave: false });

  const link = `${CLIENT_URL}/reset-password/${rawToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your password — Health Platform",
      text: `Hi ${user.name},\n\nYou requested a password reset. Visit this link to set a new password:\n${link}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
      html: `<p>Hi ${user.name},</p><p>You requested a password reset. Click below to set a new password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
  }

  res.json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Password has been reset. You can now log in.",
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    res.status(400);
    throw new Error("Verification link is invalid or has expired");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Email verified successfully" });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.isEmailVerified) {
    res.json({ success: true, message: "Email is already verified" });
    return;
  }

  await sendVerificationEmail(user);
  res.json({ success: true, message: "Verification email sent" });
});

module.exports = {
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
};
