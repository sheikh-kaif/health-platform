const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    licenseNumber: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["basic", "advanced_life_support", "van"],
      default: "basic",
    },
    location: {
      city: String,
      state: String,
    },

    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ambulance", ambulanceSchema);
