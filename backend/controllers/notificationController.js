import Notification from "../models/notification_model.js";
import PushSubscription from "../models/push_subscription_model.js";

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

export const listNotifications = async (req, res) => {
  try {
    const hasPagination =
      req.query.paginated === "true" ||
      req.query.page !== undefined ||
      req.query.limit !== undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20));
    const baseFilter = { userId: req.user._id };

    if (!hasPagination) {
      const list = await Notification.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return ok(res, list);
    }

    const total = await Notification.countDocuments(baseFilter);
    const skip = (page - 1) * limit;
    const items = await Notification.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return ok(res, {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("List notifications error:", err);
    return fail(res, "Failed to list notifications", 500);
  }
};

export const unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });
    return ok(res, { count });
  } catch (err) {
    console.error("Unread count error:", err);
    return fail(res, "Failed to get unread count", 500);
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return ok(res, { ok: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return fail(res, "Failed to mark read", 500);
  }
};

export const subscribe = async (req, res) => {
  try {
    const { subscription, userAgent } = req.body || {};
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return fail(res, "Invalid subscription payload", 400);
    }

    await PushSubscription.updateOne(
      { userId: req.user._id, endpoint: subscription.endpoint },
      {
        $set: {
          keys: subscription.keys,
          userAgent: userAgent || null,
        },
      },
      { upsert: true }
    );
    return ok(res, { ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return fail(res, "Failed to subscribe", 500);
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return fail(res, "endpoint is required", 400);
    await PushSubscription.deleteOne({ userId: req.user._id, endpoint });
    return ok(res, { ok: true });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return fail(res, "Failed to unsubscribe", 500);
  }
};
