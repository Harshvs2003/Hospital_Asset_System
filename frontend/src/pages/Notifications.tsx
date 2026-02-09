import React from "react";
import { get, post } from "../lib/api";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  type?: string;
  data?: any;
  isRead?: boolean;
  createdAt?: string;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const NotificationsPage: React.FC = () => {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [permission, setPermission] = React.useState(Notification.permission);

  const fetchList = React.useCallback(async () => {
    try {
      const res = await get("/notifications");
      const list = Array.isArray(res?.data) ? res.data : res || [];
      setItems(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchList();
    const id = setInterval(fetchList, 15000);
    return () => {
      clearInterval(id);
      post("/notifications/mark-read").catch(() => {});
    };
  }, [fetchList]);

  const enablePush = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;
      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!key) {
        setError("Missing VITE_VAPID_PUBLIC_KEY");
        return;
      }
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await post("/notifications/subscribe", {
        subscription: sub,
        userAgent: navigator.userAgent,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to enable push notifications");
    }
  };

  const disablePush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await post("/notifications/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to disable push notifications");
    }
  };

  return (
    <div className="page space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">New notifications stay highlighted until you leave this page.</p>
        </div>
        <div className="flex items-center gap-2">
          {permission === "granted" ? (
            <button
              onClick={disablePush}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Disable push
            </button>
          ) : (
            <button
              onClick={enablePush}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Enable push
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg shadow divide-y">
        {loading ? (
          <div className="panel-pad text-sm text-gray-500">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="panel-pad text-sm text-gray-500">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div
              key={n._id}
              className={`panel-pad flex flex-col gap-1 ${
                n.isRead ? "bg-white" : "bg-blue-50 border-l-4 border-blue-500"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">{n.title}</div>
              <div className="text-sm text-gray-700">{n.body}</div>
              <div className="text-xs text-gray-500">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
