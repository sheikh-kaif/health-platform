const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    requestedDate: { type: Date, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    confirmedDate: { type: Date },
    cancellationReason: { type: String },

    resultingRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },
  },
  { timestamps: true },
);

// A doctor can only have one active (pending/confirmed) appointment at a
// given slot start time. This is the last line of defense against two
// patients booking the same slot at the same time (race condition safe,
// unlike an application-level check alone).
appointmentSchema.index(
  { doctor: 1, requestedDate: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
  },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
