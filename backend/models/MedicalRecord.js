const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
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
    visitDate: { type: Date, default: Date.now },
    diagnosis: { type: String, required: true, trim: true },

    notes: { type: String },
    symptoms: [String],
    medicines: [
      {
        name: { type: String, required: true },
        dosage: String,
        frequency: String,
        durationDays: Number,
      },
    ],

    attachments: [
      {
        type: {
          type: String,
          enum: ["prescription", "lab_report", "scan", "other"],
          default: "other",
        },
        fileName: String,
        url: String,
        publicId: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

medicalRecordSchema.index({ diagnosis: 1 });
medicalRecordSchema.index({ visitDate: 1 });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
