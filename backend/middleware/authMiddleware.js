// middleware/authMiddleware.js
import { verifyAccessToken } from "../utils/tokenUtils.js";
import User from "../models/users_model.js";

/**
 * protect - middleware that checks for a Bearer access token in Authorization header.
 * On success attaches req.user = { userId, role, ...payload } and calls next().
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = verifyAccessToken(token); // throws if invalid
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized: invalid token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account disabled" });
    }
    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Account blocked until ${user.blockedUntil.toISOString()}`,
      });
    }

    req.user = user;
    req.auth = payload;

    return next();
  } catch (err) {
    console.error("Auth protect error:", err);
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

/**
 * requireRole - middleware factory to restrict routes by role(s).
 * Accepts a string role or an array of roles.
 *
 * Usage:
 *   router.post("/admin", protect, requireRole("admin"), handler)
 *   router.post("/either", protect, requireRole(["admin","supervisor"]), handler)
 */
export const requireRole = (roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: "Not authenticated" });

  // normalize to array
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return next();
};

export const blockWriteIfViewer = () => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: "Not authenticated" });
  const method = req.method?.toUpperCase();
  if (req.user.role === "VIEWER" && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return res.status(403).json({ success: false, message: "Viewers cannot modify data" });
  }
  return next();
};
