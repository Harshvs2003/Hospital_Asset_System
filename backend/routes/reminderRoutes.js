import express from "express";
import { runReminders, listReminders, completeReminder } from "../controllers/reminderController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

const requireCronKey = (req, res, next) => {
  const key = req.headers["x-cron-secret"];
  if (!process.env.CRON_SERVICE_SECRET || key !== process.env.CRON_SERVICE_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

router.post("/run", requireCronKey, runReminders);
router.get("/list", protect, requireRole(["ADMIN", "SUPERVISOR", "VIEWER"]), listReminders);
router.post(
  "/complete",
  protect,
  requireRole(["ADMIN", "SUPERVISOR"]),
  completeReminder
);

export default router;
