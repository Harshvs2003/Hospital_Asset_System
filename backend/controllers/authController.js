// controllers/authController.js
import bcrypt from "bcrypt";
import User from "../models/users_model.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";

// helper to set refresh cookie
const sendRefreshCookie = (res, token) => {
  const cookieName = process.env.COOKIE_NAME || "rf_token";
  const isProd = process.env.NODE_ENV === "production";

  // For cross-site deployments (frontend != backend) you need sameSite: "none" and secure: true in production.
  // For local/dev use lax to allow easier testing.
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd, // true in production (requires HTTPS)
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth", // cookie sent only to auth endpoints (adjust if needed)
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
};

// helper to set access cookie
const sendAccessCookie = (res, token) => {
  const cookieName = "access_token";
  const isProd = process.env.NODE_ENV === "production";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/", // sent to all routes
    maxAge: 1000 * 60 * 15, // 15 minutes
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });

    // create tokens
    const accessToken = createAccessToken(user);
    const { token: refreshToken, jti } = createRefreshToken(user);

    // store jti in user record (single session)
    user.refreshTokenId = jti;
    await user.save();

    // send tokens as httpOnly cookies
    sendAccessCookie(res, accessToken);
    sendRefreshCookie(res, refreshToken);

    // send back user (safe) only
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      res.clearCookie(cookieName, { path: "/api/auth" });
      return res.status(401).json({ message: "User not found" });
    }

    // ensure token jti matches stored jti (rotation single-session)
    if (!user.refreshTokenId || user.refreshTokenId !== payload.jti) {
      // possible reuse or logout — reject and clear cookie
      res.clearCookie(cookieName, {
        path: "/api/auth",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      return res.status(401).json({ message: "Refresh token not recognized" });
    }

    // OK: rotate — issue new tokens and update DB jti
    const accessToken = createAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = createRefreshToken(user);

    user.refreshTokenId = newJti;
    await user.save();

    // set new cookies
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
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "rf_token";
    const token = req.cookies?.[cookieName];

    // If token present, attempt to clear user refreshTokenId
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const user = await User.findById(payload.userId);
        if (user) {
          user.refreshTokenId = null;
          await user.save();
        }
      } catch (err) {
        // ignore verification errors
      }
    }

    // clear cookies on client (match sameSite/secure/path options)
    res.clearCookie("access_token", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    res.clearCookie(cookieName, {
      path: "/api/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
