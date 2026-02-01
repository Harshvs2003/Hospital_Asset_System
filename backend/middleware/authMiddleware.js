// middleware/authMiddleware.js
import { verifyAccessToken } from "../utils/tokenUtils.js";

/**
 * protect - middleware that checks for a Bearer access token in Authorization header.
 * On success attaches req.user = { userId, role, ...payload } and calls next().
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = verifyAccessToken(token); // throws if invalid
    } catch (err) {
      return res.status(401).json({ message: "Not authorized: invalid token" });
    }

    // attach minimal user info for controllers (keep whole payload if needed)
    req.user = {
      userId: payload.userId,
      role: payload.role,
      ...payload,
    };

    return next();
  } catch (err) {
    console.error("Auth protect error:", err);
    return res.status(401).json({ message: "Not authorized" });
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
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  // normalize to array
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};
