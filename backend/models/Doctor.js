const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    specialization: { type: String, required: true },
    qualification: { type: String },
    yearsOfExperience: { type: Number, default: 0 },
    hospital: { type: String },
    location: {
      city: String,
      state: String,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Doctor", doctorSchema);
