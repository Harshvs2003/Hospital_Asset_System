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
