import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // hashed
    role: {
      type: String,
      enum: ["ADMIN", "SUPERVISOR", "VIEWER", "DEPARTMENT_USER"],
      default: "DEPARTMENT_USER",
    },
    departmentId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    blockedUntil: { type: Date, default: null },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    blockReason: { type: String, default: null },
    refreshTokenIds: { type: [String], default: [] }, // store active refresh token jtis
    emailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpires: { type: Date, default: null },
    emailVerificationOtpAttempts: { type: Number, default: 0 },
    emailVerificationOtpLastSentAt: { type: Date, default: null },
    emailVerificationOtpResendCount: { type: Number, default: 0 },
    emailVerificationOtpResendWindowStart: { type: Date, default: null },
    passwordResetOtpHash: { type: String, default: null },
    passwordResetOtpExpires: { type: Date, default: null },
    passwordResetOtpAttempts: { type: Number, default: 0 },
    passwordResetOtpLastSentAt: { type: Date, default: null },
    passwordResetOtpResendCount: { type: Number, default: 0 },
    passwordResetOtpResendWindowStart: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.pre("validate", function (next) {
  if (typeof this.role === "string") {
    const r = this.role.toLowerCase();
    if (r === "admin") this.role = "ADMIN";
    if (r === "supervisor") this.role = "SUPERVISOR";
    if (r === "viewer") this.role = "VIEWER";
    if (r === "departmentuser" || r === "department_user") {
      this.role = "DEPARTMENT_USER";
    }
  }

  if (this.role === "DEPARTMENT_USER" && !this.departmentId) {
    this.invalidate(
      "departmentId",
      "departmentId is required for DEPARTMENT_USER",
    );
  }
  next();
});

export default mongoose.model("User", UserSchema);
