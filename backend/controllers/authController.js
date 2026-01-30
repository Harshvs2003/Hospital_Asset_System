import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/users_model.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";

/**
 * ENV-AWARE FLAG
 * - development  → localhost
 * - production   → render + vercel
 */
const isProd = process.env.NODE_ENV === "production";

/**
 * Set REFRESH token cookie
 */
const sendRefreshCookie = (res, token) => {
  const cookieName = process.env.COOKIE_NAME || "rf_token";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,                    // ❗ false on localhost, true on prod
    sameSite: isProd ? "none" : "lax", // ❗ required for cross-site
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,  // 30 days
  });
};

/**
 * Set ACCESS token cookie
 */
const sendAccessCookie = (res, token) => {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * REGISTER
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
    });

    const accessToken = createAccessToken(user);
    const { token: refreshToken, jti } = createRefreshToken(user);

    user.refreshTokenId = jti;
    await user.save();

    sendAccessCookie(res, accessToken);
    sendRefreshCookie(res, refreshToken);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);
    const { token: refreshToken, jti } = createRefreshToken(user);

    user.refreshTokenId = jti;
    await user.save();

    sendAccessCookie(res, accessToken);
    sendRefreshCookie(res, refreshToken);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * REFRESH TOKEN (manual rotation if frontend calls it)
 */
export const refreshToken = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";
    const token = req.cookies?.[cookieName];
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const payload = verifyRefreshToken(token);

    const user = await User.findById(payload.userId);
    if (!user || user.refreshTokenId !== payload.jti) {
      res.clearCookie(cookieName, {
        path: "/",
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
      });
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = createAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = createRefreshToken(user);

    user.refreshTokenId = newJti;
    await user.save();

    sendAccessCookie(res, accessToken);
    sendRefreshCookie(res, newRefreshToken);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

/**
 * LOGOUT
 */
export const logout = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";

    res.clearCookie("access_token", {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });

    res.clearCookie(cookieName, {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
};

/**
 * ME (SESSION RESTORE)
 * 🔑 Uses REFRESH token as source of truth
 */
export const me = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";
    const refreshToken = req.cookies?.[cookieName];

    if (!refreshToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || user.refreshTokenId !== payload.jti) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Always issue fresh access token
    const newAccessToken = createAccessToken(user);
    sendAccessCookie(res, newAccessToken);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(401).json({ message: "Not authenticated" });
  }
};
