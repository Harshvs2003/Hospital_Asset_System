import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

export const hashOtp = (otp, userId, purpose) => {
  const secret = process.env.OTP_SECRET || "";
  return crypto
    .createHash("sha256")
    .update(`${otp}:${userId}:${purpose}:${secret}`)
    .digest("hex");
};

export const buildOtpRecord = (otp, userId, purpose) => {
  return {
    otpHash: hashOtp(otp, userId, purpose),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    attempts: 0,
  };
};

export const verifyOtp = ({ otp, userId, purpose, record }) => {
  if (!record?.otpHash || !record?.expiresAt) {
    return { ok: false, reason: "OTP not requested" };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "OTP attempts exceeded" };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "OTP expired" };
  }
  const expected = hashOtp(otp, userId, purpose);
  if (expected !== record.otpHash) {
    return { ok: false, reason: "Invalid OTP" };
  }
  return { ok: true };
};
