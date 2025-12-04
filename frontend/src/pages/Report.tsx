// src/pages/ReportPage.tsx
import React from "react";
import { get } from "../lib/api"; // centralized API helper
import { Calendar, Download, Printer, RotateCw } from "lucide-react";

type Asset = {
  _id?: string;
  assetId?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  departmentName?: string;
  status?: string; // e.g. "Available", "Under Maintenance", "Damaged", etc
  purchaseDate?: string | null;
  createdAt?: string | null;
  price?: number;
};

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d).slice(0, 10);
  }
};

const ReportPage: React.FC = () => {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // filters
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  // load assets
  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get("/assets"); // expects list
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load assets for reports:", err);
      setError("Failed to load assets. Try again.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // derived lists
  const categories = React.useMemo(
    () =>
      Array.from(
        new Set(assets.map((a) => (a.category || "").trim()).filter(Boolean))
      ).sort(),
    [assets]
  );
  const locations = React.useMemo(
    () =>
      Array.from(
        new Set(assets.map((a) => (a.location || "").trim()).filter(Boolean))
      ).sort(),
    [assets]
  );

  // filtered assets by UI filters
  const filteredAssets = React.useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return assets.filter((a) => {
      const created = a.createdAt ? new Date(a.createdAt) : null;
      if (categoryFilter !== "All" && (a.category || "") !== categoryFilter)
        return false;
      if (from && created && created < from) return false;
      // include full "to" day
      if (to && created && created > new Date(to.getTime() + 86400000))
        return false;
      if ((from || to) && !created) return false;
      return true;
    }); 
  }, [assets, categoryFilter, fromDate, toDate]);

  // summary stats
  const summary = React.useMemo(() => {
    const total = filteredAssets.length;
    const available = filteredAssets.filter((a) =>
      (a.status || "").toLowerCase().includes("available")
    ).length;
    const maintenance = filteredAssets.filter(
      (a) =>
        (a.status || "").toLowerCase().includes("maintenance") ||
        (a.status || "").toLowerCase().includes("under maintenance")
    ).length;
    const damaged = filteredAssets.filter(
      (a) =>
        (a.status || "").toLowerCase().includes("damaged") ||
        (a.status || "").toLowerCase().includes("out of order")
    ).length;
    const totalValue = filteredAssets.reduce((s, a) => s + (a.price || 0), 0);
    return { total, available, maintenance, damaged, totalValue };
  }, [filteredAssets]);

  // group by category
  const byCategory = React.useMemo(() => {
    const map = new Map<
      string,
      { total: number; available: number; maintenance: number; damaged: number }
    >();
    for (const a of filteredAssets) {
      const key = a.category || "Uncategorized";
      const entry = map.get(key) || {
        total: 0,
        available: 0,
        maintenance: 0,
        damaged: 0,
      };
      entry.total += 1;
      const s = (a.status || "").toLowerCase();
      if (s.includes("available")) entry.available++;
      if (s.includes("maintenance") || s.includes("under maintenance"))
        entry.maintenance++;
      if (s.includes("damaged") || s.includes("out of order")) entry.damaged++;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAssets]);

  // group by location
  const byLocation = React.useMemo(() => {
    const map = new Map<
      string,
      { total: number; available: number; maintenance: number; damaged: number }
    >();
    for (const a of filteredAssets) {
      const key = a.location || a.departmentName || "Unknown";
      const entry = map.get(key) || {
        total: 0,
        available: 0,
        maintenance: 0,
        damaged: 0,
      };
      entry.total += 1;
      const s = (a.status || "").toLowerCase();
      if (s.includes("available")) entry.available++;
      if (s.includes("maintenance") || s.includes("under maintenance"))
        entry.maintenance++;
      if (s.includes("damaged") || s.includes("out of order")) entry.damaged++;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([location, stats]) => ({ location, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAssets]);

  // CSV export
  const exportCSV = React.useCallback(() => {
    const rows = [
      [
        "Asset ID",
        "Name",
        "Category",
        "Subcategory",
        "Location",
        "Status",
        "Department",
        "Created At",
        "Purchase Date",
        "Price",
      ],
      ...filteredAssets.map((a) => [
        a.assetId || a._id || "",
        a.name || "",
        a.category || "",
        a.subcategory || "",
        a.location || "",
        a.status || "",
        a.departmentName || "",
        a.createdAt ? new Date(a.createdAt).toISOString() : "",
        a.purchaseDate || "",
        a.price !== undefined ? String(a.price) : "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assets-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filteredAssets]);

  // Print / Export to printable HTML (user can Save as PDF)
  const exportPrintable = React.useCallback(() => {
    const html = `
      <html>
      <head>
        <title>Assets Report</title>
        <style>
          body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; padding: 20px; color: #111827; }
          h1 { font-size: 20px; margin-bottom: 0.2rem; }
          .meta { color: #6b7280; margin-bottom: 1rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 8px 6px; border: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
          .summary { display:flex; gap:12px; margin-top:8px; flex-wrap:wrap; }
          .card { background:#fff; border:1px solid #e6eef8; padding:8px 10px; border-radius:6px; min-width:120px; }
        </style>
      </head>
      <body>
        <h1>Assets Report</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        <div class="summary">
          <div class="card"><strong>Total</strong><div>${
            summary.total
          }</div></div>
          <div class="card"><strong>Available</strong><div>${
            summary.available
          }</div></div>
          <div class="card"><strong>Maintenance</strong><div>${
            summary.maintenance
          }</div></div>
          <div class="card"><strong>Damaged</strong><div>${
            summary.damaged
          }</div></div>
          <div class="card"><strong>Total Value</strong><div>${summary.totalValue.toLocaleString()}</div></div>
        </div>

        <h2 style="margin-top:18px;">By Category</h2>
        <table>
          <thead><tr><th>Category</th><th>Total</th><th>Available</th><th>Maintenance</th><th>Damaged</th></tr></thead>
          <tbody>
            ${byCategory
              .map(
                (c) =>
                  `<tr><td>${escapeHtml(c.category)}</td><td>${
                    c.total
                  }</td><td>${c.available}</td><td>${c.maintenance}</td><td>${
                    c.damaged
                  }</td></tr>`
              )
              .join("")}
          </tbody>
        </table>

        <h2 style="margin-top:18px;">By Location</h2>
        <table>
          <thead><tr><th>Location</th><th>Total</th><th>Available</th><th>Maintenance</th><th>Damaged</th></tr></thead>
          <tbody>
            ${byLocation
              .map(
                (l) =>
                  `<tr><td>${escapeHtml(l.location)}</td><td>${
                    l.total
                  }</td><td>${l.available}</td><td>${l.maintenance}</td><td>${
                    l.damaged
                  }</td></tr>`
              )
              .join("")}
          </tbody>
        </table>

        <div style="margin-top:18px;">
          <button onclick="window.print()" style="padding:8px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print / Save as PDF</button>
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
    if (!w) {
      alert("Popup blocked. Allow popups to print or save as PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }, [summary, byCategory, byLocation]);

  // small helpers
  function escapeHtml(str?: string) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Overview, breakdowns and exports for inventory assets.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadAssets}
            className="px-3 py-2 bg-white border rounded flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-white border rounded flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={exportPrintable}
            className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Export to PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row md:items-end md:gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 mr-2">Category</label>
          <select
            className="px-3 py-2 border rounded"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <label className="text-sm text-gray-600">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <label className="text-sm text-gray-600">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <div className="ml-auto mt-3 md:mt-0 text-sm text-gray-600">
          <div>
            Total assets: <strong>{summary.total}</strong>
          </div>
          <div>
            Value: <strong>{summary.totalValue.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
          Loading assets...
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow p-6 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm text-gray-600">Total Assets</h3>
              <p className="text-2xl font-bold text-blue-600">
                {summary.total}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm text-gray-600">Available</h3>
              <p className="text-2xl font-bold text-green-600">
                {summary.available}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm text-gray-600">Under Maintenance</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.maintenance}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm text-gray-600">Damaged</h3>
              <p className="text-2xl font-bold text-red-600">
                {summary.damaged}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 col-span-full">
              <h3 className="text-sm text-gray-600">Total Inventory Value</h3>
              <p className="text-2xl font-bold">
                {summary.totalValue.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">
              Breakdown by Category
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Available</th>
                    <th className="text-left py-2">Maintenance</th>
                    <th className="text-left py-2">Damaged</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((c) => (
                    <tr key={c.category} className="border-b">
                      <td className="py-2">{c.category}</td>
                      <td>{c.total}</td>
                      <td>{c.available}</td>
                      <td>{c.maintenance}</td>
                      <td>{c.damaged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">
              Breakdown by Location
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left py-2">Location</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Available</th>
                    <th className="text-left py-2">Maintenance</th>
                    <th className="text-left py-2">Damaged</th>
                  </tr>
                </thead>
                <tbody>
                  {byLocation.map((l) => (
                    <tr key={l.location} className="border-b">
                      <td className="py-2">{l.location}</td>
                      <td>{l.total}</td>
                      <td>{l.available}</td>
                      <td>{l.maintenance}</td>
                      <td>{l.damaged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Raw assets (preview)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead className="border-b border-gray-300">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Location</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Created</th>
                    <th className="text-left py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.slice(0, 200).map((a) => (
                    <tr key={a._id || a.assetId} className="border-b">
                      <td className="py-2 font-mono">{a.assetId || a._id}</td>
                      <td>{a.name}</td>
                      <td>{a.category}</td>
                      <td>{a.location || a.departmentName}</td>
                      <td>{a.status || "-"}</td>
                      <td>{fmtDate(a.createdAt)}</td>
                      <td>
                        {a.price !== undefined ? a.price.toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAssets.length > 200 && (
                <div className="text-xs text-gray-500 mt-2">
                  Previewing first 200 rows. Export CSV for full dataset.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;
