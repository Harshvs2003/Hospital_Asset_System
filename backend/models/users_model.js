import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // hashed
    role: {
      type: String,
      enum: ["admin", "supervisor", "departmentUser"],
      default: "admin",
    },
    refreshTokenId: { type: String, default: null }, // store latest refresh token jti
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
