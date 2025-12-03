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

  // httpOnly, secure in prod, sameSite lax to allow navigation from QR scanner
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd, // true in production (requires HTTPS)
    sameSite: "lax",
    path: "/api/auth", // only send cookie to auth endpoints (optional)
    maxAge: 1000 * 60 * 60 * 24 * 30, // fallback 30 days
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

    user.refreshTokenId = jti;
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
    const cookieName = process.env.COOKIE_NAME || "session_token";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(token); // will throw if invalid/expired
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // ensure token jti matches stored jti (rotation single-session)
    if (!user.refreshTokenId || user.refreshTokenId !== payload.jti) {
      // possible reuse or logout — reject and clear cookie
      res.clearCookie(cookieName, { path: "/api/auth" });
      return res.status(401).json({ message: "Refresh token not recognized" });
    }

    // OK: rotate — issue new tokens and update DB jti
    const accessToken = createAccessToken(user);
    const { token: newRefreshToken, jti: newJti } = createRefreshToken(user);

    user.refreshTokenId = newJti;
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
        // ignore
      }
    }

    // clear cookie on client
    res.clearCookie(cookieName, { path: "/api/auth" });
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
  res.json({ id: req.user.userId, role: req.user.role });
};
