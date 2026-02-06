import React from "react";
import { BadgeCheck, CheckCircle2, Circle, Filter, RefreshCcw, XCircle } from "lucide-react";
import { get, patch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Complaint = {
  _id: string;
  type: string;
  description: string;
  assetId?: string | null;
  departmentId: string;
  status: "OPEN" | "SUPERVISOR_RESOLVED" | "CLOSED";
  createdAt?: string;
  supervisorResolvedBy?: string | null;
  supervisorResolvedAt?: string | null;
  supervisorNote?: string | null;
  closedAt?: string | null;
  departmentFeedback?: string | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
};

type ActionType = "resolve" | "close" | "reopen";

const statusStyles: Record<Complaint["status"], string> = {
  OPEN: "bg-amber-100 text-amber-800",
  SUPERVISOR_RESOLVED: "bg-blue-100 text-blue-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
};

const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdminSupervisor = role === "ADMIN" || role === "SUPERVISOR";
  const isDeptUser = role === "DEPARTMENT_USER";
  const isViewer = role === "VIEWER";

  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<"ALL" | Complaint["status"]>("ALL");
  const [assetFilter, setAssetFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");

  const [action, setAction] = React.useState<{ type: ActionType; complaint: Complaint } | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchComplaints = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (assetFilter.trim()) params.assetId = assetFilter.trim();
      if (departmentFilter.trim() && isAdminSupervisor) {
        params.departmentId = departmentFilter.trim();
      }

      const data = await get("/complaints", { params });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setComplaints(list);
    } catch (err: any) {
      console.error("Failed to load complaints:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load complaints";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, assetFilter, departmentFilter, isAdminSupervisor]);

  React.useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const resolvedCount = complaints.filter((c) => c.status === "SUPERVISOR_RESOLVED").length;
  const closedCount = complaints.filter((c) => c.status === "CLOSED").length;

  const canResolve = (c: Complaint) => isAdminSupervisor && c.status === "OPEN";
  const canClose = (c: Complaint) =>
    (isAdminSupervisor || isDeptUser) && c.status === "SUPERVISOR_RESOLVED";
  const canReopen = (c: Complaint) =>
    (isAdminSupervisor || isDeptUser) && c.status === "SUPERVISOR_RESOLVED";

  const startAction = (type: ActionType, complaint: Complaint) => {
    setNote("");
    setAction({ type, complaint });
  };

  const closeAction = () => {
    setAction(null);
    setNote("");
  };

  const submitAction = async () => {
    if (!action) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = action.complaint._id;
      if (action.type === "resolve") {
        await patch(`/complaints/${id}/supervisor-resolve`, {
          supervisorNote: note || undefined,
        });
      }
      if (action.type === "close") {
        await patch(`/complaints/${id}/close`, {
          departmentFeedback: note || undefined,
        });
      }
      if (action.type === "reopen") {
        await patch(`/complaints/${id}/reopen`, {
          reopenReason: note || undefined,
        });
      }
      closeAction();
      await fetchComplaints();
    } catch (err: any) {
      console.error("Failed to update complaint:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Action failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg">
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Complaint Hub</p>
            <h1 className="text-3xl font-semibold">All Complaints</h1>
            <p className="text-sm text-blue-100">
              {isDeptUser
                ? "Your department queue only."
                : "Global view across all departments."}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase text-blue-200">Open</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase text-blue-200">Resolved</p>
              <p className="text-2xl font-semibold">{resolvedCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase text-blue-200">Closed</p>
              <p className="text-2xl font-semibold">{closedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter size={18} />
            <span className="text-sm font-semibold">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="SUPERVISOR_RESOLVED">Supervisor Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <input
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              placeholder="Asset ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {isAdminSupervisor && (
              <input
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                placeholder="Department ID"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <button
              onClick={fetchComplaints}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <RefreshCcw size={16} />
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Complaint Queue</h2>
              <p className="text-sm text-slate-500">
                {isViewer ? "Read-only access" : "Actionable based on your role"}
              </p>
            </div>
            {isViewer && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Viewer mode
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading complaints...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : complaints.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No complaints found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {complaints.map((c) => (
              <div key={c._id} className="grid gap-4 p-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{c.type}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[c.status]}`}>
                      {c.status.replace("_", " ")}
                    </span>
                    {c.assetId && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        Asset {c.assetId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{c.description}</p>
                  <div className="text-xs text-slate-500">
                    Dept: {c.departmentId} · Created: {formatDate(c.createdAt)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Supervisor</p>
                  <p>Resolved: {formatDate(c.supervisorResolvedAt)}</p>
                  <p className="text-slate-400">{c.supervisorNote || "-"}</p>
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Department</p>
                  <p>Closed: {formatDate(c.closedAt)}</p>
                  <p className="text-slate-400">{c.departmentFeedback || "-"}</p>
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Reopen</p>
                  <p>Reopened: {formatDate(c.reopenedAt)}</p>
                  <p className="text-slate-400">{c.reopenReason || "-"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {canResolve(c) && (
                    <button
                      onClick={() => startAction("resolve", c)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <BadgeCheck size={14} />
                      Mark Resolved
                    </button>
                  )}
                  {canClose(c) && (
                    <button
                      onClick={() => startAction("close", c)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={14} />
                      Accept & Close
                    </button>
                  )}
                  {canReopen(c) && (
                    <button
                      onClick={() => startAction("reopen", c)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      <XCircle size={14} />
                      Reject & Reopen
                    </button>
                  )}
                  {!canResolve(c) && !canClose(c) && !canReopen(c) && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                      <Circle size={12} />
                      No actions
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {action.type === "resolve" && "Supervisor Resolve"}
                {action.type === "close" && "Accept & Close"}
                {action.type === "reopen" && "Reject & Reopen"}
              </h3>
              <button onClick={closeAction} className="text-slate-400 hover:text-slate-600">
                X
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {action.type === "resolve" &&
                "Add an optional supervisor note before marking this complaint resolved."}
              {action.type === "close" &&
                "Confirm department acceptance and optionally add feedback."}
              {action.type === "reopen" &&
                "Provide a reason to reopen. Supervisor marker will be cleared."}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Add a note (optional)"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeAction}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
