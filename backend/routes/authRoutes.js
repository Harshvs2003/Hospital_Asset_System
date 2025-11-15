// routes/authRoutes.js
import express from "express";
import { register, login, refreshToken, logout, me } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/refresh", refreshToken);    // client calls this to rotate and obtain new access token
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;

 

