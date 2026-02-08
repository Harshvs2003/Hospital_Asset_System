// controllers/authController.js
import bcrypt from "bcrypt";
import User from "../models/users_model.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";
import { isValidDepartmentId } from "../config/departments.js";
import { sendEmail } from "../utils/emailSender.js";
import {
  verificationEmailTemplate,
  resetPasswordEmailTemplate,
  welcomeEmailTemplate,
} from "../utils/emailTemplates.js";
import {
  buildOtpRecord,
  generateOtp,
  verifyOtp,
  OTP_MAX_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
} from "../utils/otpUtils.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_WINDOW_MS = 10 * 60 * 1000;
const RESEND_MAX_PER_WINDOW = 3;

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
      emailVerified: false,
    });

    const otp = generateOtp();
    const record = buildOtpRecord(otp, user._id, "verify_email");
    user.emailVerificationOtpHash = record.otpHash;
    user.emailVerificationOtpExpires = record.expiresAt;
    user.emailVerificationOtpAttempts = record.attempts;
    user.emailVerificationOtpLastSentAt = new Date();
    user.emailVerificationOtpResendCount = 1;
    user.emailVerificationOtpResendWindowStart = new Date();
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Your verification OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: verificationEmailTemplate({
        name: user.name,
        otp,
        expiresMinutes: OTP_EXPIRY_MINUTES,
      }),
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      requiresVerification: true,
      email: user.email,
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
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify to continue.",
        requiresVerification: true,
      });
    }

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
        departmentId: user.departmentId || null,
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
        departmentId: user.departmentId || null,
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

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const record = {
      otpHash: user.emailVerificationOtpHash,
      expiresAt: user.emailVerificationOtpExpires,
      attempts: user.emailVerificationOtpAttempts || 0,
    };

    const result = verifyOtp({
      otp,
      userId: user._id,
      purpose: "verify_email",
      record,
    });

    if (!result.ok) {
      user.emailVerificationOtpAttempts = Math.min(
        OTP_MAX_ATTEMPTS,
        (user.emailVerificationOtpAttempts || 0) + 1
      );
      await user.save();
      return res.status(400).json({ message: result.reason });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpires = null;
    user.emailVerificationOtpAttempts = 0;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Welcome to Asset Operations",
      text: "Welcome to Asset Operations. Your account is verified and ready to use.",
      html: welcomeEmailTemplate({ name: user.name }),
    });

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const now = Date.now();
    if (user.emailVerificationOtpLastSentAt) {
      const sinceLast = now - new Date(user.emailVerificationOtpLastSentAt).getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        return res.status(429).json({
          message: "Please wait before requesting another OTP",
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000),
        });
      }
    }

    let windowStart = user.emailVerificationOtpResendWindowStart
      ? new Date(user.emailVerificationOtpResendWindowStart).getTime()
      : 0;
    if (!windowStart || now - windowStart > RESEND_WINDOW_MS) {
      windowStart = now;
      user.emailVerificationOtpResendCount = 0;
    }

    if ((user.emailVerificationOtpResendCount || 0) >= RESEND_MAX_PER_WINDOW) {
      const remainingMs = RESEND_WINDOW_MS - (now - windowStart);
      return res.status(429).json({
        message: "OTP resend limit reached. Please try later.",
        retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      });
    }

    const otp = generateOtp();
    const record = buildOtpRecord(otp, user._id, "verify_email");
    user.emailVerificationOtpHash = record.otpHash;
    user.emailVerificationOtpExpires = record.expiresAt;
    user.emailVerificationOtpAttempts = record.attempts;
    user.emailVerificationOtpLastSentAt = new Date();
    user.emailVerificationOtpResendCount = (user.emailVerificationOtpResendCount || 0) + 1;
    user.emailVerificationOtpResendWindowStart = new Date(windowStart);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Your verification OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: verificationEmailTemplate({
        name: user.name,
        otp,
        expiresMinutes: OTP_EXPIRY_MINUTES,
      }),
    });

    return res.json({ message: "Verification OTP sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = Date.now();
    if (user.passwordResetOtpLastSentAt) {
      const sinceLast = now - new Date(user.passwordResetOtpLastSentAt).getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        return res.status(429).json({
          message: "Please wait before requesting another OTP",
          retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000),
        });
      }
    }

    let windowStart = user.passwordResetOtpResendWindowStart
      ? new Date(user.passwordResetOtpResendWindowStart).getTime()
      : 0;
    if (!windowStart || now - windowStart > RESEND_WINDOW_MS) {
      windowStart = now;
      user.passwordResetOtpResendCount = 0;
    }

    if ((user.passwordResetOtpResendCount || 0) >= RESEND_MAX_PER_WINDOW) {
      const remainingMs = RESEND_WINDOW_MS - (now - windowStart);
      return res.status(429).json({
        message: "OTP resend limit reached. Please try later.",
        retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      });
    }

    const otp = generateOtp();
    const record = buildOtpRecord(otp, user._id, "reset_password");
    user.passwordResetOtpHash = record.otpHash;
    user.passwordResetOtpExpires = record.expiresAt;
    user.passwordResetOtpAttempts = record.attempts;
    user.passwordResetOtpLastSentAt = new Date();
    user.passwordResetOtpResendCount = (user.passwordResetOtpResendCount || 0) + 1;
    user.passwordResetOtpResendWindowStart = new Date(windowStart);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Your password reset OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: resetPasswordEmailTemplate({
        name: user.name,
        otp,
        expiresMinutes: OTP_EXPIRY_MINUTES,
      }),
    });

    return res.json({ message: "Password reset OTP sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const record = {
      otpHash: user.passwordResetOtpHash,
      expiresAt: user.passwordResetOtpExpires,
      attempts: user.passwordResetOtpAttempts || 0,
    };

    const result = verifyOtp({
      otp,
      userId: user._id,
      purpose: "reset_password",
      record,
    });

    if (!result.ok) {
      user.passwordResetOtpAttempts = Math.min(
        OTP_MAX_ATTEMPTS,
        (user.passwordResetOtpAttempts || 0) + 1
      );
      await user.save();
      return res.status(400).json({ message: result.reason });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    user.passwordResetOtpAttempts = 0;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
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
