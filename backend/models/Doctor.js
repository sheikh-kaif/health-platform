const mongoose = require("mongoose");

// One entry per weekday (0 = Sunday ... 6 = Saturday). Times are "HH:mm" in
// the clinic's local time (this app does not do cross-timezone conversion).
function defaultWeeklyHours() {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    isWorking: false,
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "13:00",
    breakEnd: "14:00",
  }));
}

const weeklyHourSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    isWorking: { type: Boolean, default: false },
    startTime: { type: String, default: "09:00" }, // "HH:mm"
    endTime: { type: String, default: "17:00" },
    // Optional lunch/other break inside the working window. Leave both
    // blank to signal "no break".
    breakStart: { type: String, default: "" },
    breakEnd: { type: String, default: "" },
  },
  { _id: false },
);

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

    // How the doctor actually sees patients in real life: a per-weekday
    // working window, a fixed time-per-patient, and specific days off.
    schedule: {
      slotDurationMinutes: { type: Number, default: 15, min: 5, max: 180 },
      weeklyHours: { type: [weeklyHourSchema], default: defaultWeeklyHours },
      // Specific calendar dates the doctor is unavailable (holiday, leave,
      // conference, etc.), stored as UTC midnight for the given day.
      holidays: { type: [Date], default: [] },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Doctor", doctorSchema);
