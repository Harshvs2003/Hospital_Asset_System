import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type PerformedBy = { name?: string; role?: string } | string | null | undefined;

export type HistoryEvent = {
  type?: "ASSET_EVENT" | "COMPLAINT_EVENT";
  complaintId?: string;
  action?: string;
  message?: string;
  performedBy?: PerformedBy;
  performedAt?: string;
};

type ComplaintGroup = {
  complaintId: string;
  events: HistoryEvent[];
  anchorAt: string | null;
  title: string;
  status: "OPEN" | "SUPERVISOR_RESOLVED" | "CLOSED";
};

type TimelineItem =
  | { kind: "EVENT"; event: HistoryEvent }
  | { kind: "COMPLAINT_GROUP"; group: ComplaintGroup };

const toDate = (d?: string | null) => (d ? new Date(d) : null);

const formatDateTime = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getPerformedByLabel = (pb?: PerformedBy) => {
  if (!pb) return "-";
  if (typeof pb === "string") return pb;
  const name = pb.name || "-";
  const role = pb.role ? ` (${pb.role})` : "";
  return `${name}${role}`;
};

const inferComplaintStatus = (events: HistoryEvent[]): ComplaintGroup["status"] => {
  const ordered = [...events].sort((a, b) => {
    const da = toDate(a.performedAt)?.getTime() ?? 0;
    const db = toDate(b.performedAt)?.getTime() ?? 0;
    return da - db;
  });
  let status: ComplaintGroup["status"] = "OPEN";
  for (const e of ordered) {
    const action = (e.action || e.message || "").toLowerCase();
    if (action.includes("resolved")) status = "SUPERVISOR_RESOLVED";
    if (action.includes("closed")) status = "CLOSED";
    if (action.includes("reopened") || action.includes("reopen")) status = "OPEN";
  }
  return status;
};

const buildTimeline = (history: HistoryEvent[]): TimelineItem[] => {
  const events = (history || []).map((h) => ({
    ...h,
    performedAt: h.performedAt || (h as any).date,
    message: h.message || (h as any).description,
    action: h.action || "History",
  }));

  const complaintGroups = new Map<string, ComplaintGroup>();
  const assetEvents: HistoryEvent[] = [];

  for (const ev of events) {
    if (ev.complaintId) {
      const key = ev.complaintId;
      if (!complaintGroups.has(key)) {
        complaintGroups.set(key, {
          complaintId: key,
          events: [],
          anchorAt: null,
          title: "Complaint Filed",
          status: "OPEN",
        });
      }
      const group = complaintGroups.get(key)!;
      group.events.push(ev);
      if (!group.anchorAt || (ev.performedAt && ev.performedAt < group.anchorAt)) {
        group.anchorAt = ev.performedAt || null;
      }
    } else {
      assetEvents.push(ev);
    }
  }

  const groupItems: ComplaintGroup[] = Array.from(complaintGroups.values()).map((g) => {
    const status = inferComplaintStatus(g.events);
    const first = [...g.events].sort((a, b) => {
      const da = toDate(a.performedAt)?.getTime() ?? 0;
      const db = toDate(b.performedAt)?.getTime() ?? 0;
      return da - db;
    })[0];
    const title = (first?.action || first?.message || "Complaint Filed") as string;
    return { ...g, status, title };
  });

  const items: TimelineItem[] = [
    ...assetEvents.map((event) => ({ kind: "EVENT", event }) as TimelineItem),
    ...groupItems.map((group) => ({ kind: "COMPLAINT_GROUP", group }) as TimelineItem),
  ];

  return items.sort((a, b) => {
    const da =
      a.kind === "EVENT"
        ? toDate(a.event.performedAt)?.getTime() ?? 0
        : toDate(a.group.anchorAt)?.getTime() ?? 0;
    const db =
      b.kind === "EVENT"
        ? toDate(b.event.performedAt)?.getTime() ?? 0
        : toDate(b.group.anchorAt)?.getTime() ?? 0;
    return da - db;
  });
};

export const TimelineEvent: React.FC<{ event: HistoryEvent }> = ({ event }) => {
  return (
    <div className="relative pl-10">
      <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full bg-slate-200 border border-slate-400" />
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">{event.action}</div>
          <div className="text-xs text-slate-500">{formatDateTime(event.performedAt)}</div>
        </div>
        {event.message && <div className="text-sm text-slate-600 mt-1">{event.message}</div>}
        <div className="text-xs text-slate-500 mt-2">By: {getPerformedByLabel(event.performedBy)}</div>
      </div>
    </div>
  );
};

export const ComplaintBranch: React.FC<{
  group: ComplaintGroup;
  collapsed: boolean;
  onToggle: () => void;
}> = ({ group, collapsed, onToggle }) => {
  const statusStyles: Record<ComplaintGroup["status"], string> = {
    OPEN: "bg-amber-100 text-amber-800",
    SUPERVISOR_RESOLVED: "bg-blue-100 text-blue-800",
    CLOSED: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="relative pl-10">
      <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full bg-amber-200 border border-amber-500" />
      <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm ${group.status === "CLOSED" ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onToggle} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            {`Complaint Session (${group.status.replace("_", " ")})`}
          </button>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[group.status]}`}>
            {group.status.replace("_", " ")}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">{group.title}</div>
      </div>

      {!collapsed && (
        <div className="mt-3 pl-6 border-l-2 border-amber-300 space-y-3">
          {group.events
            .sort((a, b) => {
              const da = toDate(a.performedAt)?.getTime() ?? 0;
              const db = toDate(b.performedAt)?.getTime() ?? 0;
              return da - db;
            })
            .map((ev, idx) => (
              <div key={`${group.complaintId}-${idx}`} className="relative pl-6">
                <div className="absolute -left-2.25 top-1 h-3 w-3 rounded-full bg-amber-300 border border-amber-600" />
                <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{ev.action}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(ev.performedAt)}</div>
                  </div>
                  {ev.message && <div className="text-sm text-slate-600 mt-1">{ev.message}</div>}
                  <div className="text-xs text-slate-500 mt-2">
                    By: {getPerformedByLabel(ev.performedBy)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const AssetHistoryTimeline: React.FC<{ history: HistoryEvent[] }> = ({ history }) => {
  const items = React.useMemo(() => buildTimeline(history), [history]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.kind === "COMPLAINT_GROUP") {
        next[item.group.complaintId] = item.group.status === "CLOSED";
      }
    });
    setCollapsed((prev) => ({ ...next, ...prev }));
  }, [items]);

  if (!items.length) {
    return <div className="text-sm text-slate-500">No history available.</div>;
  }

  return (
    <div className="relative space-y-6">
      <div className="absolute left-2.75 top-0 h-full w-0.5 bg-slate-300" />
      {items.map((item, idx) =>
        item.kind === "EVENT" ? (
          <TimelineEvent key={`ev-${idx}`} event={item.event} />
        ) : (
          <ComplaintBranch
            key={`cg-${item.group.complaintId}`}
            group={item.group}
            collapsed={!!collapsed[item.group.complaintId]}
            onToggle={() =>
              setCollapsed((prev) => ({
                ...prev,
                [item.group.complaintId]: !prev[item.group.complaintId],
              }))
            }
          />
        )
      )}
    </div>
  );
};

export default AssetHistoryTimeline;
