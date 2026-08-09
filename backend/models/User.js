const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "ambulance_driver"],
      required: true,
      default: "patient",
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },

    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, index: true, sparse: true, unique: true },

    avatarUrl: { type: String },
    avatarPublicId: { type: String },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // Forgot / reset password.
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.pre("validate", function (next) {
  if (this.authProvider === "local" && !this.password) {
    this.invalidate(
      "password",
      "Password is required for email/password accounts",
    );
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createToken = function (field, expiresField, ttlMinutes) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this[field] = crypto.createHash("sha256").update(rawToken).digest("hex");
  this[expiresField] = Date.now() + ttlMinutes * 60 * 1000;
  return rawToken;
};

module.exports = mongoose.model("User", userSchema);
