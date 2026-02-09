import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listNotifications,
  unreadCount,
  markAllRead,
  subscribe,
  unsubscribe,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, listNotifications);
router.get("/unread-count", protect, unreadCount);
router.post("/mark-read", protect, markAllRead);
router.post("/subscribe", protect, subscribe);
router.post("/unsubscribe", protect, unsubscribe);

export default router;
