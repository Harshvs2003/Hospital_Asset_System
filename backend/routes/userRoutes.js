import express from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
} from "../controllers/userController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin full CRUD
router.get("/", protect, requireRole("ADMIN"), listUsers);
router.get("/:id", protect, requireRole("ADMIN"), getUser);
router.post("/", protect, requireRole("ADMIN"), createUser);
router.put("/:id", protect, requireRole("ADMIN"), updateUser);
router.patch("/:id", protect, requireRole("ADMIN"), updateUser);
router.delete("/:id", protect, requireRole("ADMIN"), deleteUser);

// Block/unblock (ADMIN, SUPERVISOR)
router.patch(
  "/:id/block",
  protect,
  requireRole(["ADMIN", "SUPERVISOR"]),
  blockUser
);
router.patch(
  "/:id/unblock",
  protect,
  requireRole(["ADMIN", "SUPERVISOR"]),
  unblockUser
);

export default router;
