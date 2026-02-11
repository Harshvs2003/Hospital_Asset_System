import moment from "moment-timezone";
import Asset from "../models/assets_model.js";
import User from "../models/users_model.js";
import { sendEmail } from "../utils/emailSender.js";
import { reminderEmailTemplate, reminderUpdateTemplate } from "../utils/emailTemplates.js";
import { fetchDeptUsers, fetchUsersByRole, notifyUsers } from "../utils/notificationService.js";

const TZ = "Asia/Kolkata";

const isValidInterval = (startDays, intervalDays) => {
  if (![7, 15, 30].includes(startDays)) return false;
  if (startDays === 7) return intervalDays === 1;
  if (startDays === 15) return [1, 2].includes(intervalDays);
  if (startDays === 30) return [1, 3, 5].includes(intervalDays);
  return false;
};

const getDaysLeft = (date) => {
  if (!date) return null;
  const today = moment().tz(TZ).startOf("day");
  const due = moment(date).tz(TZ).startOf("day");
  return due.diff(today, "days");
};

const shouldSendToday = ({ daysLeft, startDays, intervalDays }) => {
  if (daysLeft === null || startDays === null || intervalDays === null) return false;
  if (daysLeft < 0) return false;
  if (daysLeft > startDays) return false;

  const mandatory = new Set([startDays, startDays - 1, 1, 0].filter((d) => d >= 0));
  if (mandatory.has(daysLeft)) return true;

  if (intervalDays === 1) return true;

  const offset = startDays - daysLeft;
  return offset % intervalDays === 0;
};

const alreadySentToday = (lastSentAt) => {
  if (!lastSentAt) return false;
  const last = moment(lastSentAt).tz(TZ).startOf("day");
  const today = moment().tz(TZ).startOf("day");
  return last.isSame(today);
};

const buildReminderPayload = ({ asset, type, daysLeft, startDays }) => {
  const progress = startDays ? daysLeft / startDays : 0;
  let color = "green";
  let status = "active";

  if (daysLeft < 0) {
    status = "expired";
    color = "red";
  } else if (progress <= 0.33) {
    color = "red";
  } else if (progress <= 0.66) {
    color = "orange";
  }

  return {
    type,
    assetDbId: String(asset._id),
    assetId: asset.assetId || null,
    assetName: asset.name || "",
    category: asset.category || "",
    departmentId: asset.departmentId || null,
    departmentName: asset.departmentName || null,
    daysLeft,
    dueDate: type === "service" ? asset.lastServiceDate : asset.contractExpiryDate,
    startDays,
    progress,
    color,
    status,
  };
};

const fetchSupervisors = async () => {
  return User.find({ role: "SUPERVISOR", isActive: true, emailVerified: true }).select("email name");
};

export const runReminders = async (_req, res) => {
  try {
    const assets = await Asset.find({
      $or: [
        { "reminderService.enabled": true },
        { "reminderContract.enabled": true },
      ],
    }).lean();

    const supervisors = await fetchSupervisors();
    if (!supervisors.length) {
      return res.json({ success: true, sent: 0, message: "No supervisors to notify" });
    }

    let sent = 0;
    const now = new Date();

    for (const asset of assets) {
      // Service reminders
      if (asset.reminderService?.enabled && asset.lastServiceDate) {
        const startDays = asset.reminderService.startDays;
        const intervalDays = asset.reminderService.intervalDays;
        if (isValidInterval(startDays, intervalDays)) {
          const daysLeft = getDaysLeft(asset.lastServiceDate);
          const expiredToday = daysLeft === -1;
          const shouldSend = expiredToday || shouldSendToday({ daysLeft, startDays, intervalDays });
          if (shouldSend && !alreadySentToday(asset.reminderServiceLastSentAt)) {
            const payload = buildReminderPayload({
              asset,
              type: "service",
              daysLeft,
              startDays,
            });
            const deptUsers = await fetchDeptUsers(asset.departmentId);
            const supervisors = await fetchUsersByRole(["SUPERVISOR"]);
            const admins = process.env.REMINDER_NOTIFY_ADMIN === "true"
              ? await fetchUsersByRole(["ADMIN"])
              : [];
            const label = payload.assetId
              ? `${payload.assetName} (${payload.assetId})`
              : `${payload.assetName}`;
            const title = expiredToday ? "Service due expired" : "Service due reminder";
            const body = expiredToday
              ? `${label} service date expired.`
              : `${label} service due in ${payload.daysLeft} day(s).`;
            const type = expiredToday ? "REMINDER_SERVICE_EXPIRED" : "REMINDER_SERVICE";
            await notifyUsers({
              users: [...deptUsers, ...supervisors, ...admins],
              title,
              body,
              type,
              data: { ...payload, url: "/reminders" },
              departmentId: asset.departmentId || null,
            });
            if (!expiredToday) {
              await Promise.all(
                supervisors.map((s) =>
                  sendEmail({
                    to: s.email,
                    subject: `Service Due Reminder: ${payload.assetName} (${payload.assetId})`,
                    text: `Service due in ${payload.daysLeft} day(s).`,
                    html: reminderEmailTemplate({
                      name: s.name,
                      reminder: payload,
                      appName: process.env.APP_NAME || "Asset Operations",
                    }),
                  })
                )
              );
              sent += supervisors.length;
            }
            await Asset.updateOne(
              { _id: asset._id },
              { $set: { reminderServiceLastSentAt: now } }
            );
          }
        }
      }

      // Contract reminders
      if (asset.reminderContract?.enabled && asset.contractExpiryDate) {
        const startDays = asset.reminderContract.startDays;
        const intervalDays = asset.reminderContract.intervalDays;
        if (isValidInterval(startDays, intervalDays)) {
          const daysLeft = getDaysLeft(asset.contractExpiryDate);
          const expiredToday = daysLeft === -1;
          const shouldSend = expiredToday || shouldSendToday({ daysLeft, startDays, intervalDays });
          if (shouldSend && !alreadySentToday(asset.reminderContractLastSentAt)) {
            const payload = buildReminderPayload({
              asset,
              type: "contract",
              daysLeft,
              startDays,
            });
            const deptUsers = await fetchDeptUsers(asset.departmentId);
            const supervisors = await fetchUsersByRole(["SUPERVISOR"]);
            const admins = process.env.REMINDER_NOTIFY_ADMIN === "true"
              ? await fetchUsersByRole(["ADMIN"])
              : [];
            const label = payload.assetId
              ? `${payload.assetName} (${payload.assetId})`
              : `${payload.assetName}`;
            const title = expiredToday ? "Contract expiry expired" : "Contract expiry reminder";
            const body = expiredToday
              ? `${label} contract expired.`
              : `${label} contract expires in ${payload.daysLeft} day(s).`;
            const type = expiredToday ? "REMINDER_CONTRACT_EXPIRED" : "REMINDER_CONTRACT";
            await notifyUsers({
              users: [...deptUsers, ...supervisors, ...admins],
              title,
              body,
              type,
              data: { ...payload, url: "/reminders" },
              departmentId: asset.departmentId || null,
            });
            if (!expiredToday) {
              await Promise.all(
                supervisors.map((s) =>
                  sendEmail({
                    to: s.email,
                    subject: `Contract Expiry Reminder: ${payload.assetName} (${payload.assetId})`,
                    text: `Contract expires in ${payload.daysLeft} day(s).`,
                    html: reminderEmailTemplate({
                      name: s.name,
                      reminder: payload,
                      appName: process.env.APP_NAME || "Asset Operations",
                    }),
                  })
                )
              );
              sent += supervisors.length;
            }
            await Asset.updateOne(
              { _id: asset._id },
              { $set: { reminderContractLastSentAt: now } }
            );
          }
        }
      }
    }

    return res.json({ success: true, sent });
  } catch (err) {
    console.error("Run reminders error:", err);
    return res.status(500).json({ success: false, message: "Failed to run reminders" });
  }
};

export const listReminders = async (_req, res) => {
  try {
    const assets = await Asset.find({
      $or: [
        { "reminderService.enabled": true },
        { "reminderContract.enabled": true },
      ],
    }).lean();

    const service = [];
    const contract = [];
    const serviceExpired = [];
    const contractExpired = [];

    for (const asset of assets) {
      if (asset.reminderService?.enabled && asset.lastServiceDate) {
        const startDays = asset.reminderService.startDays;
        const intervalDays = asset.reminderService.intervalDays;
        if (isValidInterval(startDays, intervalDays)) {
          const daysLeft = getDaysLeft(asset.lastServiceDate);
          if (daysLeft <= startDays) {
            const payload = buildReminderPayload({
              asset,
              type: "service",
              daysLeft,
              startDays,
            });
            if (daysLeft < 0) serviceExpired.push(payload);
            else service.push(payload);
          }
        }
      }

      if (asset.reminderContract?.enabled && asset.contractExpiryDate) {
        const startDays = asset.reminderContract.startDays;
        const intervalDays = asset.reminderContract.intervalDays;
        if (isValidInterval(startDays, intervalDays)) {
          const daysLeft = getDaysLeft(asset.contractExpiryDate);
          if (daysLeft <= startDays) {
            const payload = buildReminderPayload({
              asset,
              type: "contract",
              daysLeft,
              startDays,
            });
            if (daysLeft < 0) contractExpired.push(payload);
            else contract.push(payload);
          }
        }
      }
    }

    return res.json({
      success: true,
      service,
      contract,
      serviceExpired,
      contractExpired,
    });
  } catch (err) {
    console.error("List reminders error:", err);
    return res.status(500).json({ success: false, message: "Failed to list reminders" });
  }
};

export const completeReminder = async (req, res) => {
  try {
    const { assetId, type, newDate } = req.body || {};
    if (!assetId || !type) {
      return res.status(400).json({ message: "assetId and type are required" });
    }
    if (!["service", "contract"].includes(type)) {
      return res.status(400).json({ message: "Invalid reminder type" });
    }

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (type === "service") {
      if (newDate) {
        asset.lastServiceDate = new Date(newDate);
        asset.reminderServiceLastSentAt = null;
      } else {
        asset.reminderService.enabled = false;
      }
    }

    if (type === "contract") {
      if (newDate) {
        asset.contractExpiryDate = new Date(newDate);
        asset.reminderContractLastSentAt = null;
      } else {
        asset.reminderContract.enabled = false;
      }
    }

    await asset.save();

    if (req.user?.email) {
      await sendEmail({
        to: req.user.email,
        subject: "Reminder updated",
        text: "Reminder updated successfully.",
        html: reminderUpdateTemplate({
          name: req.user.name,
          asset,
          type,
          newDate,
          appName: process.env.APP_NAME || "Asset Operations",
        }),
      });
    }

    return res.json({ success: true, message: "Reminder updated" });
  } catch (err) {
    console.error("Complete reminder error:", err);
    return res.status(500).json({ message: "Failed to update reminder" });
  }
};
