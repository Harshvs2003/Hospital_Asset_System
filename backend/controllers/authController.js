// controllers/authController.js
import bcrypt from "bcrypt";
import User from "../models/users_model.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";
import { isValidDepartmentId } from "../config/departments.js";

// helper to set refresh cookie
const sendRefreshCookie = (res, token) => {
  const cookieName = process.env.COOKIE_NAME || "rf_token";
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN;
  const sameSite =
    process.env.COOKIE_SAMESITE ||
    (isProd ? "lax" : "lax");
  const secure =
    process.env.COOKIE_SECURE === "true" ? true : isProd;

  // For cross-site deployments (frontend != backend) you need sameSite: "none" and secure: true in production.
  // For local/dev use lax to allow easier testing.
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    path: "/api/auth", // cookie sent only to auth endpoints (adjust if needed)
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const normalizedRole =
      typeof role === "string" ? role.toUpperCase() : "DEPARTMENT_USER";
    if (normalizedRole === "DEPARTMENT_USER" && !departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }
    if (departmentId && !isValidDepartmentId(departmentId)) {
      return res.status(400).json({ message: "Invalid departmentId" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: normalizedRole,
      departmentId: departmentId || null,
    });

    // create tokens
    const accessToken = createAccessToken(user);
    const { token: refreshToken, jti } = createRefreshToken(user);

    // store jti in user record (multi-session)
    user.refreshTokenIds = Array.isArray(user.refreshTokenIds)
      ? [...new Set([...user.refreshTokenIds, jti])].slice(-5)
      : [jti];
    await user.save();

    // send refresh token as httpOnly cookie
    sendRefreshCookie(res, refreshToken);

    // send back user (safe) + access token
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = createAccessToken(user);
    const { token: refreshToken, jti } = createRefreshToken(user);

    user.refreshTokenIds = Array.isArray(user.refreshTokenIds)
      ? [...new Set([...user.refreshTokenIds, jti])].slice(-5)
      : [jti];
    await user.save();

    sendRefreshCookie(res, refreshToken);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(token); // will throw if invalid/expired
    } catch (err) {
      // clear cookie if invalid
      res.clearCookie(cookieName, {
        path: "/api/auth",
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true" ? true : process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "lax" : "lax"),
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      });
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      res.clearCookie(cookieName, { path: "/api/auth" });
      return res.status(401).json({ message: "User not found" });
    }

    // ensure token jti matches stored jti (rotation multi-session)
    const legacyId = user.refreshTokenId;
    const tokenIds = Array.isArray(user.refreshTokenIds)
      ? user.refreshTokenIds
      : [];

    const hasToken =
      tokenIds.includes(payload.jti) || (legacyId && legacyId === payload.jti);

    if (!hasToken) {
      // possible reuse or logout — reject and clear cookie
      res.clearCookie(cookieName, {
        path: "/api/auth",
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === "true" ? true : process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "lax" : "lax"),
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      });
      return res.status(401).json({ message: "Refresh token not recognized" });
    }

    // OK: rotate — issue new tokens and update DB jti
    const accessToken = createAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = createRefreshToken(user);

    const nextIds = tokenIds.filter((t) => t !== payload.jti);
    nextIds.push(newJti);
    user.refreshTokenIds = Array.from(new Set(nextIds)).slice(-5);
    user.refreshTokenId = undefined;
    await user.save();

    // set new cookie
    sendRefreshCookie(res, newRefreshToken);

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";
    const token = req.cookies?.[cookieName];

    // If token present, attempt to clear user refreshTokenId(s)
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const user = await User.findById(payload.userId);
        if (user) {
          if (Array.isArray(user.refreshTokenIds)) {
            user.refreshTokenIds = user.refreshTokenIds.filter(
              (t) => t !== payload.jti
            );
          }
          if (user.refreshTokenId && user.refreshTokenId === payload.jti) {
            user.refreshTokenId = null;
          }
          await user.save();
        }
      } catch (err) {
        // ignore verification errors
      }
    }

    // clear cookie on client (match sameSite/secure/path options)
    res.clearCookie(cookieName, {
      path: "/api/auth",
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" ? true : process.env.NODE_ENV === "production",
      sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "lax" : "lax"),
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
    return res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Optional: get current user info (requires access token via Authorization header)
export const me = async (req, res) => {
  // req.user is set by authMiddleware.protect
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  // Return safe user info (expand if you need more)
  res.json({
    id: req.user.userId,
    role: req.user.role,
    name: req.user.name || undefined,
    email: req.user.email || undefined,
  });
};
