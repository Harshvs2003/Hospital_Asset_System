import webpush from "web-push";
import Notification from "../models/notification_model.js";
import PushSubscription from "../models/push_subscription_model.js";
import User from "../models/users_model.js";

let vapidConfigured = false;

const ensureVapid = () => {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
};

export const fetchUsersByRole = async (roles = []) => {
  if (!roles.length) return [];
  return User.find({ role: { $in: roles }, isActive: true }).select("_id role departmentId");
};

export const fetchDeptUsers = async (departmentId) => {
  if (!departmentId) return [];
  return User.find({ role: "DEPARTMENT_USER", departmentId, isActive: true }).select("_id role departmentId");
};

const uniqueUserIds = (users) => {
  const set = new Set();
  users.forEach((u) => set.add(String(u._id)));
  return Array.from(set);
};

export const notifyUsers = async ({
  users = [],
  title,
  body,
  type = "GENERAL",
  data = {},
  departmentId = null,
  role = null,
}) => {
  if (!users.length) return;

  const userIds = uniqueUserIds(users);

  const docs = userIds.map((userId) => ({
    userId,
    title,
    body,
    type,
    data,
    departmentId,
    role,
  }));

  await Notification.insertMany(docs);

  ensureVapid();
  if (!vapidConfigured) return;

  const subs = await PushSubscription.find({ userId: { $in: userIds } }).lean();
  if (!subs.length) return;

  const payload = JSON.stringify({ title, body, data, type });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payload
        );
      } catch (err) {
        const statusCode = err?.statusCode || err?.status;
        if (statusCode === 410 || statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push send error:", err?.message || err);
        }
      }
    })
  );
};
