const mongoose = require("mongoose");

// A single ambulance booking. Broadcast to every driver on creation;
// whichever driver accepts first wins (enforced atomically in the
// controller with a findOneAndUpdate status guard, not here).
const ambulanceRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    pickupAddress: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },

    pickupLocation: {
      lat: Number,
      lng: Number,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Ambulance" },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AmbulanceRequest", ambulanceRequestSchema);
