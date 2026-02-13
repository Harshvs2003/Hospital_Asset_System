import Asset from "../models/assets_model.js";
import ReminderLog from "../models/ReminderLog.js";
import User from "../models/users_model.js";
import { sendReminderEmail } from "../utils/resendMail.js";
import {
  today,
  daysLeftFrom,
  isValidReminderInterval,
  normalizeReminder,
  getInitialNextReminderAt,
  shouldSendReminderToday,
  getPostSendNextReminderAt,
  formatDateForEmail,
} from "../utils/reminderUtils.js";

const CRON_HEADER = "x-cron-secret";

const getReminderSubject = ({ reminderType, assetName, daysLeft }) => {
  if (reminderType === "service") {
    return `Service Due Reminder: ${assetName} - ${daysLeft} days left`;
  }
  return `Contract Expiry Reminder: ${assetName} - ${daysLeft} days left`;
};

const buildUpdatePayload = (reminderType, values) => {
  if (reminderType === "service") {
    return {
      serviceLastReminderSentAt: values.lastSentAt,
      serviceNextReminderAt: values.nextReminderAt,
      // keep legacy field in sync
      reminderServiceLastSentAt: values.lastSentAt,
    };
  }
  return {
    contractLastReminderSentAt: values.lastSentAt,
    contractNextReminderAt: values.nextReminderAt,
    // keep legacy field in sync
    reminderContractLastSentAt: values.lastSentAt,
  };
};

const processReminder = async ({ asset, reminderType, referenceDay }) => {
  const normalized = normalizeReminder(asset, reminderType);
  if (!normalized.enabled || !normalized.dueDate) return { attempted: false };

  const { dueDate, startDays, intervalDays, lastReminderSentAt, email } = normalized;
  if (!isValidReminderInterval(startDays, intervalDays)) {
    return { attempted: false, invalid: true };
  }

  const daysLeft = daysLeftFrom(dueDate, referenceDay);
  if (daysLeft === null || daysLeft > startDays || daysLeft < -2) {
    return { attempted: false };
  }

  const existingNext = normalized.nextReminderAt;
  const nextReminderAt = existingNext || getInitialNextReminderAt({
    dueDate,
    startDays,
    referenceDay,
  });

  const shouldSend = shouldSendReminderToday({
    daysLeft,
    dueDate,
    startDays,
    nextReminderAt,
    lastReminderSentAt,
    referenceDay,
  });

  if (!shouldSend) {
    if (!existingNext && nextReminderAt) {
      const update = buildUpdatePayload(reminderType, {
        lastSentAt: lastReminderSentAt || null,
        nextReminderAt,
      });
      await Asset.updateOne({ _id: asset._id }, { $set: update });
    }
    return { attempted: false };
  }

  let recipients = [];
  if (email) recipients = [email];
  if (!recipients.length) {
    const supervisorQuery = {
      role: "SUPERVISOR",
      isActive: true,
      emailVerified: true,
      email: { $exists: true, $ne: null },
    };
    const supervisorUsers = await User.find(supervisorQuery).select("email").lean();
    recipients = supervisorUsers.map((u) => u.email).filter(Boolean);
  }
  recipients = Array.from(new Set(recipients));

  const logBase = {
    assetId: asset.assetId || String(asset._id),
    reminderType,
    deadlineDate: dueDate,
    daysLeftSent: daysLeft,
    sentAt: new Date(),
  };

  if (!recipients.length) {
    await ReminderLog.create({
      ...logBase,
      emailSentTo: "",
      status: "failed",
      errorMessage: "No reminder email on asset and no supervisor recipients found",
    });
    return { attempted: true, sent: false };
  }

  try {
    const sendResults = await Promise.allSettled(
      recipients.map((recipient) =>
        sendReminderEmail({
          to: recipient,
          subject: getReminderSubject({
            reminderType,
            assetName: asset.name || "Asset",
            daysLeft,
          }),
          assetName: asset.name || "",
          assetId: asset.assetId || String(asset._id),
          departmentName: asset.departmentName || "",
          deadlineDate: formatDateForEmail(dueDate),
          daysLeft,
          reminderStartDays: startDays,
          intervalDays,
          reminderType,
        })
      )
    );

    const sentRecipients = [];
    const failedRecipients = [];
    sendResults.forEach((result, index) => {
      const recipient = recipients[index];
      if (result.status === "fulfilled") {
        sentRecipients.push(recipient);
      } else {
        failedRecipients.push({
          recipient,
          error: result.reason?.message || "Unknown send failure",
        });
      }
    });

    if (sentRecipients.length) {
      const lastSentAt = new Date();
      const postSendNextReminderAt = getPostSendNextReminderAt({
        daysLeft,
        dueDate,
        intervalDays,
        referenceDay,
      });
      const update = buildUpdatePayload(reminderType, {
        lastSentAt,
        nextReminderAt: postSendNextReminderAt,
      });
      await Asset.updateOne({ _id: asset._id }, { $set: update });
    }

    if (sentRecipients.length) {
      await ReminderLog.insertMany(
        sentRecipients.map((recipient) => ({
          ...logBase,
          emailSentTo: recipient,
          status: "sent",
        }))
      );
    }

    if (failedRecipients.length) {
      await ReminderLog.insertMany(
        failedRecipients.map((item) => ({
          ...logBase,
          emailSentTo: item.recipient,
          status: "failed",
          errorMessage: item.error,
        }))
      );
    }

    if (sentRecipients.length) {
      return { attempted: true, sent: true };
    }

    await ReminderLog.create({
      ...logBase,
      emailSentTo: recipients.join(","),
      status: "failed",
      errorMessage: "All reminder sends failed",
    });
    return { attempted: true, sent: false };
  } catch (error) {
    await ReminderLog.create({
      ...logBase,
      emailSentTo: recipients.join(","),
      status: "failed",
      errorMessage: error?.message || "Unknown send failure",
    });
    return { attempted: true, sent: false };
  }
};

export const runCronReminders = async (_req, res) => {
  try {
    const result = await runCronRemindersJob();
    return res.json(result);
  } catch (error) {
    console.error("Run cron reminders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to run cron reminders",
    });
  }
};

export const runCronRemindersJob = async () => {
  const referenceDay = today();
  const assets = await Asset.find({
    $or: [
      { serviceDueDate: { $ne: null } },
      { contractExpiryDate: { $ne: null } },
      { lastServiceDate: { $ne: null } },
    ],
  }).lean();

  let attempted = 0;
  let sent = 0;
  let invalidConfigs = 0;

  for (const asset of assets) {
    for (const reminderType of ["service", "contract"]) {
      const result = await processReminder({ asset, reminderType, referenceDay });
      if (result.invalid) invalidConfigs += 1;
      if (result.attempted) attempted += 1;
      if (result.sent) sent += 1;
    }
  }

  return {
    success: true,
    totalAssets: assets.length,
    remindersAttempted: attempted,
    remindersSent: sent,
    invalidConfigs,
    date: referenceDay.format("YYYY-MM-DD"),
  };
};

export const verifyCronSecret = (req, res, next) => {
  const headerValue = req.headers[CRON_HEADER];
  const expected = process.env.CRON_SECRET || process.env.CRON_SERVICE_SECRET;
  if (!expected || headerValue !== expected) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return next();
};
