import mongoose from "mongoose";

const ReminderLogSchema = new mongoose.Schema(
  {
    assetId: { type: String, required: true, index: true },
    reminderType: {
      type: String,
      enum: ["service", "contract"],
      required: true,
      index: true,
    },
    deadlineDate: { type: Date, required: true },
    daysLeftSent: { type: Number, required: true },
    sentAt: { type: Date, required: true, default: Date.now },
    emailSentTo: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("ReminderLog", ReminderLogSchema);
