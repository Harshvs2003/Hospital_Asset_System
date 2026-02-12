import express from "express";
import { runCronReminders, verifyCronSecret } from "../controllers/cronController.js";
import { cronRequestLogger } from "../middleware/cronRequestLogger.js";

const router = express.Router();

router.post("/reminders", cronRequestLogger, verifyCronSecret, runCronReminders);

export default router;
