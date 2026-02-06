import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    assetId: { type: String, required: false, index: true },
    departmentId: { type: String, required: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "SUPERVISOR_RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    supervisorResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    supervisorResolvedAt: { type: Date, default: null },
    supervisorNote: { type: String, default: null },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closedAt: { type: Date, default: null },
    departmentFeedback: { type: String, default: null },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reopenedAt: { type: Date, default: null },
    reopenReason: { type: String, default: null },
    history: [
      {
        action: { type: String, required: true },
        message: { type: String, required: true },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        performedAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", ComplaintSchema);

export default Complaint;
