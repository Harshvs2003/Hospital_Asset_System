import React from "react";
import { Filter, RefreshCcw, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { DEPARTMENTS } from "../data/departments";

type ReminderItem = {
  type: "service" | "contract";
  assetDbId: string;
  assetId: string;
  assetName: string;
  category: string;
  departmentId?: string | null;
  departmentName?: string | null;
  daysLeft: number;
  dueDate?: string | null;
  startDays?: number | null;
  progress?: number;
  color?: "green" | "orange" | "red";
  status?: "active" | "expired";
};

const RemindersPage: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [serviceReminders, setServiceReminders] = React.useState<ReminderItem[]>([]);
  const [contractReminders, setContractReminders] = React.useState<ReminderItem[]>([]);
  const [serviceExpired, setServiceExpired] = React.useState<ReminderItem[]>([]);
  const [contractExpired, setContractExpired] = React.useState<ReminderItem[]>([]);

  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");
  const [deadlineSort, setDeadlineSort] = React.useState<"asc" | "desc">("asc");

  const [showExpiredService, setShowExpiredService] = React.useState(false);
  const [showExpiredContract, setShowExpiredContract] = React.useState(false);

  const [completeModal, setCompleteModal] = React.useState<{
    open: boolean;
    item: ReminderItem | null;
    newDate: string;
  }>({ open: false, item: null, newDate: "" });

  const fetchReminders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get("/reminders/list");
      setServiceReminders(Array.isArray(data?.service) ? data.service : []);
      setContractReminders(Array.isArray(data?.contract) ? data.contract : []);
      setServiceExpired(Array.isArray(data?.serviceExpired) ? data.serviceExpired : []);
      setContractExpired(Array.isArray(data?.contractExpired) ? data.contractExpired : []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load reminders";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const categories = React.useMemo(() => {
    const all = [...serviceReminders, ...contractReminders, ...serviceExpired, ...contractExpired];
    return Array.from(new Set(all.map((a) => a.category).filter(Boolean)));
  }, [serviceReminders, contractReminders, serviceExpired, contractExpired]);

  const filterList = (items: ReminderItem[]) => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => {
        if (q) {
          const name = (i.assetName || "").toLowerCase();
          const id = (i.assetId || "").toLowerCase();
          if (!name.includes(q) && !id.includes(q)) return false;
        }
        if (categoryFilter && i.category !== categoryFilter) return false;
        if (departmentFilter && (i.departmentId || "") !== departmentFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const colorOrder = { red: 0, orange: 1, green: 2 };
        const cA = colorOrder[a.color || "green"];
        const cB = colorOrder[b.color || "green"];
        if (cA !== cB) return cA - cB;
        return deadlineSort === "asc" ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft;
      });
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString();
  };

  const borderClass = (color?: string) => {
    if (color === "red") return "border-red-400";
    if (color === "orange") return "border-orange-400";
    return "border-green-400";
  };

  const openComplete = (item: ReminderItem) => {
    setCompleteModal({
      open: true,
      item,
      newDate: "",
    });
  };

  const completeReminder = async () => {
    if (!completeModal.item) return;
    try {
      await post("/reminders/complete", {
        assetId: completeModal.item.assetDbId,
        type: completeModal.item.type,
        newDate: completeModal.newDate || null,
      });
      setCompleteModal({ open: false, item: null, newDate: "" });
      await fetchReminders();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update reminder";
      setError(String(msg));
    }
  };

  const renderList = (items: ReminderItem[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((i) => (
        <div
          key={`${i.type}-${i.assetDbId}-${i.dueDate}`}
          className={`border-2 rounded-xl p-4 bg-white shadow-sm ${borderClass(i.color)}`}
        >
          <div className="text-sm font-semibold text-slate-900">{i.assetName || "Unnamed Asset"}</div>
          <div className="text-xs text-slate-500">ID: {i.assetId}</div>
          <div className="text-xs text-slate-500">
            Dept: {i.departmentName || "-"} ({i.departmentId || "-"})
          </div>
          <div className="text-xs text-slate-500">Category: {i.category || "-"}</div>
          <div className="mt-3 text-sm text-slate-700">
            Due: <span className="font-semibold">{formatDate(i.dueDate)}</span>
          </div>
          <div className="text-sm text-slate-700">
            Days left: <span className="font-semibold">{i.daysLeft}</span>
          </div>
          {!isViewer && (
            <button
              onClick={() => openComplete(i)}
              className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <CheckCircle2 size={14} /> Completed / Update Date
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Reminders</h1>
          <p className="text-sm text-slate-500">Service due and contract expiry reminders</p>
        </div>
        <button
          onClick={fetchReminders}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={18} />
            <span className="text-sm font-semibold">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by asset name or ID"
              className="w-51 rounded-lg border border-slate-300 px-4 py-2 text-sm"
            /> 
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
            <select
              value={deadlineSort}
              onChange={(e) => setDeadlineSort(e.target.value as "asc" | "desc")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="asc">Closest first</option>
              <option value="desc">Farthest first</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading reminders...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Service Reminders</h2>
            {filterList(serviceReminders).length === 0 ? (
              <div className="text-sm text-slate-500">No active service reminders.</div>
            ) : (
              renderList(filterList(serviceReminders))
            )}
          </div>

          <div className="w-120 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Contract Expiry Reminders</h2>
            {filterList(contractReminders).length === 0 ? (
              <div className="text-sm text-slate-500">No active contract reminders.</div>
            ) : (
              renderList(filterList(contractReminders))
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowExpiredService((s) => !s)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
            >
              {showExpiredService ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Expired Service Reminders
            </button>
            {showExpiredService && (
              filterList(serviceExpired).length === 0 ? (
                <div className="text-sm text-slate-500">No expired service reminders.</div>
              ) : (
                renderList(filterList(serviceExpired))
              )
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowExpiredContract((s) => !s)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
            >
              {showExpiredContract ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Expired Contract Reminders
            </button>
            {showExpiredContract && (
              filterList(contractExpired).length === 0 ? (
                <div className="text-sm text-slate-500">No expired contract reminders.</div>
              ) : (
                renderList(filterList(contractExpired))
              )
            )}
          </div>
        </>
      )}

      {completeModal.open && completeModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Update {completeModal.item.type === "service" ? "Service Date" : "Contract Date"}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Set a new date or leave blank to disable this reminder.
            </p>
            <input
              type="date"
              value={completeModal.newDate}
              onChange={(e) => setCompleteModal((s) => ({ ...s, newDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setCompleteModal({ open: false, item: null, newDate: "" })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={completeReminder}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;
