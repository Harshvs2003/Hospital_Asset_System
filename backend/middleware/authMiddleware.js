// middleware/authMiddleware.js
import { verifyAccessToken } from "../utils/tokenUtils.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Not authorized" });

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token); // throws if invalid
    // attach minimal user info for controllers
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized: " + err.message });
  }
};
4
// simple role check middleware factory
export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
  return next();
};
