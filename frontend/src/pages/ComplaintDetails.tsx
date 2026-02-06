import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../lib/api";

type Complaint = {
  _id: string;
  type: string;
  description: string;
  assetId?: string | null;
  departmentId: string;
  status: "OPEN" | "SUPERVISOR_RESOLVED" | "CLOSED";
  createdAt?: string;
  supervisorResolvedAt?: string | null;
  supervisorNote?: string | null;
  closedAt?: string | null;
  departmentFeedback?: string | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  history?: Array<{
    action: string;
    message: string;
    performedAt: string;
  }>;
};

const ComplaintDetails: React.FC = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = React.useState<Complaint | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!complaintId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await get(`/complaints/${complaintId}`);
        setComplaint(data?.data || null);
      } catch (err: any) {
        console.error("Failed to load complaint:", err);
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load complaint";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [complaintId]);

  const shortDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Back
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading complaint...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : !complaint ? (
        <div className="text-sm text-slate-500">Complaint not found.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{complaint.type}</h1>
            <p className="text-sm text-slate-500">{complaint.description}</p>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>Status: {complaint.status}</div>
            <div>Asset ID: {complaint.assetId || "-"}</div>
            <div>Department ID: {complaint.departmentId}</div>
            <div>Created: {shortDate(complaint.createdAt)}</div>
            <div>Supervisor Resolved: {shortDate(complaint.supervisorResolvedAt)}</div>
            <div>Supervisor Note: {complaint.supervisorNote || "-"}</div>
            <div>Closed At: {shortDate(complaint.closedAt)}</div>
            <div>Department Feedback: {complaint.departmentFeedback || "-"}</div>
            <div>Reopened At: {shortDate(complaint.reopenedAt)}</div>
            <div>Reopen Reason: {complaint.reopenReason || "-"}</div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">History</h2>
            {!complaint.history || complaint.history.length === 0 ? (
              <div className="text-sm text-slate-500">No history entries.</div>
            ) : (
              <ul className="space-y-2">
                {complaint.history.map((h, i) => (
                  <li key={`${h.action}-${i}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-700">{h.action}</div>
                    <div className="text-xs text-slate-500">{h.message}</div>
                    <div className="text-xs text-slate-400">{shortDate(h.performedAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetails;
