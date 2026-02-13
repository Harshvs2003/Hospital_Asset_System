import React from "react";
import { get } from "../lib/api";
import { Download, Printer, RotateCw } from "lucide-react";

type Asset = {
  _id?: string;
  assetId?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  departmentName?: string;
  status?: string;
  purchaseDate?: string | null;
  createdAt?: string | null;
  price?: number;
};

type Summary = {
  total: number;
  available: number;
  maintenance: number;
  damaged: number;
  totalValue: number;
};

type BreakdownCategory = {
  category: string;
  total: number;
  available: number;
  maintenance: number;
  damaged: number;
};

type BreakdownLocation = {
  location: string;
  total: number;
  available: number;
  maintenance: number;
  damaged: number;
};

type PaginatedAssetsResponse = {
  items: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: Summary;
  byCategory: BreakdownCategory[];
  byLocation: BreakdownLocation[];
  categories: string[];
  cached?: boolean;
};

const EMPTY_SUMMARY: Summary = {
  total: 0,
  available: 0,
  maintenance: 0,
  damaged: 0,
  totalValue: 0,
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
  const [summary, setSummary] = React.useState<Summary>(EMPTY_SUMMARY);
  const [byCategory, setByCategory] = React.useState<BreakdownCategory[]>([]);
  const [byLocation, setByLocation] = React.useState<BreakdownLocation[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = React.useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const buildQuery = React.useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("paginated", "true");
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      return params.toString();
    },
    [categoryFilter, fromDate, toDate]
  );

  const loadAssets = React.useCallback(
    async (page = pagination.page, limit = pagination.limit) => {
      setLoading(true);
      setError(null);
      try {
        const data = (await get(`/assets?${buildQuery(page, limit)}`)) as PaginatedAssetsResponse;
        setAssets(Array.isArray(data?.items) ? data.items : []);
        setSummary(data?.summary || EMPTY_SUMMARY);
        setByCategory(Array.isArray(data?.byCategory) ? data.byCategory : []);
        setByLocation(Array.isArray(data?.byLocation) ? data.byLocation : []);
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
        setPagination(data?.pagination || { page: 1, limit, total: 0, totalPages: 1 });
        setLastLoadedAt(new Date().toISOString());
      } catch (err) {
        console.error("Failed to load assets for reports:", err);
        setError("Failed to load assets. Try again.");
        setAssets([]);
        setSummary(EMPTY_SUMMARY);
        setByCategory([]);
        setByLocation([]);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, pagination.page, pagination.limit]
  );

  React.useEffect(() => {
    loadAssets(1, pagination.limit);
  }, [categoryFilter, fromDate, toDate]);

  const rangeLabel = React.useMemo(() => {
    if (!fromDate && !toDate) return "All time";
    if (fromDate && !toDate) return `From ${fmtDate(fromDate)}`;
    if (!fromDate && toDate) return `Up to ${fmtDate(toDate)}`;
    return `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;
  }, [fromDate, toDate]);

  const fetchAllForExport = React.useCallback(async () => {
    const combined: Asset[] = [];
    let currentPage = 1;
    const limit = 200;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const data = (await get(`/assets?${buildQuery(currentPage, limit)}`)) as PaginatedAssetsResponse;
      const pageItems = Array.isArray(data?.items) ? data.items : [];
      combined.push(...pageItems);
      totalPages = data?.pagination?.totalPages || 1;
      currentPage += 1;
    }

    return combined;
  }, [buildQuery]);

  const exportCSV = React.useCallback(async () => {
    try {
      const allAssets = await fetchAllForExport();
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
        ...allAssets.map((a) => [
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
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("Failed to export CSV");
    }
  }, [fetchAllForExport]);

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
          <div class="card"><strong>Total</strong><div>${summary.total}</div></div>
          <div class="card"><strong>Available</strong><div>${summary.available}</div></div>
          <div class="card"><strong>Maintenance</strong><div>${summary.maintenance}</div></div>
          <div class="card"><strong>Damaged</strong><div>${summary.damaged}</div></div>
          <div class="card"><strong>Total Value</strong><div>${summary.totalValue.toLocaleString()}</div></div>
        </div>

        <h2 style="margin-top:18px;">By Category</h2>
        <table>
          <thead><tr><th>Category</th><th>Total</th><th>Available</th><th>Maintenance</th><th>Damaged</th></tr></thead>
          <tbody>
            ${byCategory
              .map(
                (c) =>
                  `<tr><td>${escapeHtml(c.category)}</td><td>${c.total}</td><td>${c.available}</td><td>${c.maintenance}</td><td>${c.damaged}</td></tr>`
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
                  `<tr><td>${escapeHtml(l.location)}</td><td>${l.total}</td><td>${l.available}</td><td>${l.maintenance}</td><td>${l.damaged}</td></tr>`
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

  const escapeHtml = (str?: string) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  return (
    <div className="page space-y-6">
      <div className="bg-white rounded-lg shadow panel-pad">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Structured inventory reporting with export-ready data.</p>
            <div className="text-xs text-gray-500 mt-2">
              Scope: <strong>{rangeLabel}</strong> · Category: <strong>{categoryFilter}</strong>
              {lastLoadedAt && (
                <>
                  {" "}
                  · Updated: <strong>{fmtDate(lastLoadedAt)}</strong>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadAssets(pagination.page, pagination.limit)}
              className="px-3 py-2 bg-white border rounded flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={exportCSV} className="px-3 py-2 bg-white border rounded flex items-center gap-2">
              <Download className="w-4 h-4" /> Download CSV
            </button>
            <button
              onClick={exportPrintable}
              className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500">Total Assets</div>
            <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500">Available</div>
            <div className="text-2xl font-bold text-green-600">{summary.available}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500">Under Maintenance</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.maintenance}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500">Damaged</div>
            <div className="text-2xl font-bold text-red-600">{summary.damaged}</div>
          </div>
        </div>

        <div className="mt-4 border rounded-lg p-4 flex flex-col md:flex-row md:items-end md:gap-4">
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
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border rounded" />
          </div>

          <div className="flex items-center gap-2 mt-3 md:mt-0">
            <label className="text-sm text-gray-600">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border rounded" />
          </div>

          <div className="ml-auto mt-3 md:mt-0 text-sm text-gray-600">
            <div>
              Total assets: <strong>{summary.total}</strong>
            </div>
            <div>
              Total value: <strong>{summary.totalValue.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow panel-pad text-sm text-gray-500">Loading assets...</div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow panel-pad text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow panel-pad mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Breakdown by Category</h3>
              <div className="text-xs text-gray-500">{byCategory.length} categories</div>
            </div>
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

          <div className="bg-white rounded-lg shadow panel-pad mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Breakdown by Location</h3>
              <div className="text-xs text-gray-500">{byLocation.length} locations</div>
            </div>
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

          <div className="bg-white rounded-lg shadow panel-pad">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Assets Detail</h3>
              <div className="text-xs text-gray-500">
                Showing page {pagination.page} of {pagination.totalPages} · {pagination.total} total rows
              </div>
            </div>
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
                  {assets.map((a) => (
                    <tr key={a._id || a.assetId} className="border-b">
                      <td className="py-2 font-mono">{a.assetId || a._id}</td>
                      <td>{a.name}</td>
                      <td>{a.category}</td>
                      <td>{a.location || a.departmentName}</td>
                      <td>{a.status || "-"}</td>
                      <td>{fmtDate(a.createdAt)}</td>
                      <td>{a.price !== undefined ? a.price.toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => loadAssets(Math.max(1, pagination.page - 1), pagination.limit)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadAssets(Math.min(pagination.totalPages, pagination.page + 1), pagination.limit)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;

