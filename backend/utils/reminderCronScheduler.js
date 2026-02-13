import moment from "moment-timezone";
import { runCronRemindersJob } from "../controllers/cronController.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseBoundedInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

const isEnabled = () => process.env.REMINDER_CRON_ENABLED !== "false";
const shouldRunOnStartup = () => process.env.REMINDER_CRON_RUN_ON_STARTUP === "true";
const getTimezone = () => process.env.REMINDER_CRON_TIMEZONE || "UTC";
const getIntervalHours = () => {
  if (process.env.REMINDER_CRON_INTERVAL_HOURS) {
    return parsePositiveInt(process.env.REMINDER_CRON_INTERVAL_HOURS, 2);
  }
  const minutes = parsePositiveInt(process.env.REMINDER_CRON_INTERVAL_MINUTES, 60);
  return Math.max(1, Math.floor(minutes / 60));
};
const getStartHour = () => parseBoundedInt(process.env.REMINDER_CRON_START_HOUR, 0, 0, 23);
const getStartMinute = () => parseBoundedInt(process.env.REMINDER_CRON_START_MINUTE, 0, 0, 59);

const getNextRunAt = ({ timezone, intervalHours, startHour, startMinute }) => {
  // Temporary local testing mode: next run every 2 minutes.
  // Revert to the original schedule logic after testing.
  return moment.tz(timezone).add(2, "minutes").second(0).millisecond(0);
};

export const startReminderCronScheduler = () => {
  if (!isEnabled()) {
    console.info("[reminder-cron] disabled via REMINDER_CRON_ENABLED=false");
    return () => {};
  }

  const timezone = getTimezone();
  const intervalHours = getIntervalHours();
  const startHour = getStartHour();
  const startMinute = getStartMinute();

  let timeoutHandle = null;
  let isRunning = false;
  let isStopped = false;

  const runSafely = async (trigger) => {
    if (isRunning) {
      console.warn(`[reminder-cron] skipped ${trigger} run because a previous run is still in progress`);
      return;
    }

    isRunning = true;
    try {
      const result = await runCronRemindersJob();
      console.info("[reminder-cron] completed run", { trigger, ...result });
    } catch (error) {
      console.error("[reminder-cron] run failed", { trigger, error: error?.message || error });
    } finally {
      isRunning = false;
    }
  };

  const scheduleNext = () => {
    if (isStopped) return;

    const nextRunAt = getNextRunAt({
      timezone,
      intervalHours,
      startHour,
      startMinute,
    });
    const delayMs = Math.max(1000, nextRunAt.valueOf() - Date.now());

    console.info("[reminder-cron] next run scheduled", {
      nextRunAt: nextRunAt.toISOString(),
      timezone,
      intervalHours,
      startHour,
      startMinute,
    });

    timeoutHandle = setTimeout(async () => {
      await runSafely("scheduled");
      scheduleNext();
    }, delayMs);
  };

  scheduleNext();

  if (shouldRunOnStartup()) {
    void runSafely("startup");
  }

  console.info("[reminder-cron] scheduler started", {
    timezone,
    intervalHours,
    startHour,
    startMinute,
  });

  return () => {
    isStopped = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    timeoutHandle = null;
    console.info("[reminder-cron] scheduler stopped");
  };
};
