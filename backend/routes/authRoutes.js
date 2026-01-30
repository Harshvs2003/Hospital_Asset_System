import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  me,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", me); // ❗ NO protect middleware

export default router;
