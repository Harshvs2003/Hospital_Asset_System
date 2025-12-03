// utils/tokenUtils.js
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const createAccessToken = (user) => {
  // minimal payload, short expiry
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m" }
  );
};

// create refresh token with a jti (token id) which we'll store in DB
export const createRefreshToken = (user, jti = null) => {
  const tokenId = jti || uuidv4();
  const payload = { userId: user._id, jti: tokenId };
  const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "30d",
  });
  return { token, jti: tokenId };
};

// helper to verify refresh token (throws if invalid)
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

// helper to verify access token (throws if invalid)
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};
