import express from "express";
import { runCronReminders, verifyCronSecret } from "../controllers/cronController.js";

const router = express.Router();

router.post("/reminders", verifyCronSecret, runCronReminders);

export default router;
