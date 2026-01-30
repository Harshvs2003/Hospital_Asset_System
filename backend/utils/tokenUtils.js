// utils/tokenUtils.js
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

/**
 * Helper: ensure secret exists or throw helpful error.
 */
function requireSecret(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env ${name} - set ${name} to a secure random string`);
  return val;
}

/**
 * createAccessToken(user)
 * - returns signed JWT (string) with small expiry
 * - payload contains userId and role by convention
 */
export const createAccessToken = (user) => {
  const secret = requireSecret("ACCESS_TOKEN_SECRET");
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES || "15m";
  const payload = { userId: user._id, role: user.role };

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * createRefreshToken(user, jti)
 * - returns { token, jti } where jti is token id stored in DB for rotation
 */
export const createRefreshToken = (user, jti = null) => {
  const secret = requireSecret("REFRESH_TOKEN_SECRET");
  const tokenId = jti || uuidv4();
  const payload = { userId: user._id, jti: tokenId };
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES || "30d";

  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, jti: tokenId };
};

/**
 * verifyRefreshToken(token)
 * - returns decoded payload if valid, throws otherwise
 */
export const verifyRefreshToken = (token) => {
  const secret = requireSecret("REFRESH_TOKEN_SECRET");
  try {
    // jwt.verify returns the decoded payload
    return jwt.verify(token, secret);
  } catch (err) {
    // rethrow with a cleaner message
    throw new Error("Invalid or expired refresh token");
  }
};

/**
 * verifyAccessToken(token)
 * - returns decoded payload if valid, throws otherwise
 */
export const verifyAccessToken = (token) => {
  const secret = requireSecret("ACCESS_TOKEN_SECRET");
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    throw new Error("Invalid or expired access token");
  }
};
