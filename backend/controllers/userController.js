import bcrypt from "bcrypt";
import User from "../models/users_model.js";

const error = (res, status, message) =>
  res.status(status).json({ success: false, message });

export const listUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("List users error:", err);
    return error(res, 500, "Failed to list users");
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return error(res, 404, "User not found");
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error("Get user error:", err);
    return error(res, 500, "Failed to get user");
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId, isActive } = req.body || {};
    if (!name || !email || !password) {
      return error(res, 400, "Missing fields");
    }
    const exists = await User.findOne({ email });
    if (exists) return error(res, 400, "Email already registered");

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      departmentId,
      isActive,
    });
    return res.status(201).json({ success: true, data: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error("Create user error:", err);
    return error(res, 500, err.message || "Failed to create user");
  }
};

export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");
    if (!user) return error(res, 404, "User not found");
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error("Update user error:", err);
    return error(res, 500, err.message || "Failed to update user");
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return error(res, 404, "User not found");
    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    return error(res, 500, "Failed to delete user");
  }
};

export const blockUser = async (req, res) => {
  try {
    const { durationHours, reason } = req.body || {};
    if (!durationHours || Number.isNaN(Number(durationHours))) {
      return error(res, 400, "durationHours is required");
    }
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 404, "User not found");
    if (user.role === "ADMIN" && req.user.role === "SUPERVISOR") {
      return error(res, 403, "Supervisors cannot block ADMIN");
    }

    const blockedUntil = new Date(Date.now() + Number(durationHours) * 3600 * 1000);
    user.blockedUntil = blockedUntil;
    user.blockedBy = req.user._id;
    user.blockReason = reason || null;
    await user.save();

    return res.json({ success: true, message: "User blocked", data: { blockedUntil } });
  } catch (err) {
    console.error("Block user error:", err);
    return error(res, 500, "Failed to block user");
  }
};

export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 404, "User not found");
    if (user.role === "ADMIN" && req.user.role === "SUPERVISOR") {
      return error(res, 403, "Supervisors cannot unblock ADMIN");
    }

    user.blockedUntil = null;
    user.blockedBy = null;
    user.blockReason = null;
    await user.save();

    return res.json({ success: true, message: "User unblocked" });
  } catch (err) {
    console.error("Unblock user error:", err);
    return error(res, 500, "Failed to unblock user");
  }
};
