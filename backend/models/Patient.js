const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    patientId: { type: String, required: true, unique: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodGroup: { type: String },
    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },

    location: {
      city: String,
      state: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    allergies: [String],
    chronicConditions: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", patientSchema);
