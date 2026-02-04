// src/pages/qrgen.tsx
import React from "react";
import { Search, Download, Printer, CheckSquare, Square } from "lucide-react";
import { generateQRCodeURL } from "../utils/qrcode";
import api, { get } from "../lib/api";

type AssetMinimal = {
  _id?: string;
  assetId?: string;
  name?: string;
  category?: string;
  location?: string;
  departmentName?: string;
  createdAt?: string;
  qrGenerated?: boolean;
};

const QRGenPage: React.FC = () => {
  const [mode, setMode] = React.useState<"recent" | "specific">("recent");
  const [recentAssets, setRecentAssets] = React.useState<AssetMinimal[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>(
    {},
  );
  const [loading, setLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  // specific mode
  const [query, setQuery] = React.useState("");
  const [selectedAsset, setSelectedAsset] = React.useState<AssetMinimal | null>(
    null,
  );
  const [specificAssets, setSpecificAssets] = React.useState<AssetMinimal[]>([]);
  const [loadingSpecific, setLoadingSpecific] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");

  React.useEffect(() => {
    if (mode === "recent") fetchRecentAssets();
    if (mode === "specific") fetchSpecificAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ================= FETCH RECENT =================
  const fetchRecentAssets = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      // let arr: AssetMinimal[] = [];

      const data = await get("/assets?per=100&sort=createdAt_desc");
      const arr = Array.isArray(data) ? data : [];

      setRecentAssets(arr.filter((a) => !a.qrGenerated));
      setSelectedIds({});
    } catch (err) {
      console.error(err);
      setActionMessage("Failed to load recent assets");
      setRecentAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= SPECIFIC (LOCAL SEARCH) =================
  const fetchSpecificAssets = async () => {
    setLoadingSpecific(true);
    try {
      const data = await get("/assets");
      const arr = Array.isArray(data) ? data : [];
      setSpecificAssets(arr);
    } catch (err) {
      console.error("Failed to load assets for specific search", err);
      setSpecificAssets([]);
    } finally {
      setLoadingSpecific(false);
    }
  };

  const searchResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return specificAssets.filter((a) => {
      const matchesQuery =
        (a.assetId || "").toLowerCase().includes(q) ||
        (a.name || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q) ||
        (a.departmentName || "").toLowerCase().includes(q);

      const matchesCategory = !categoryFilter || (a.category || "") === categoryFilter;
      const matchesDepartment =
        !departmentFilter || (a.departmentName || "") === departmentFilter;

      return matchesQuery && matchesCategory && matchesDepartment;
    });
  }, [specificAssets, query, categoryFilter, departmentFilter]);

  const categories = React.useMemo(
    () => Array.from(new Set(specificAssets.map((a) => a.category || "").filter(Boolean))),
    [specificAssets],
  );
  const departments = React.useMemo(
    () =>
      Array.from(
        new Set(specificAssets.map((a) => a.departmentName || "").filter(Boolean)),
      ),
    [specificAssets],
  );

  // ================= SELECTION =================
  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    recentAssets.forEach((a) => a._id && (all[a._id] = true));
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds({});

  const getSelectedAssets = () =>
    recentAssets.filter((a) => a._id && selectedIds[a._id]);

  // ================= MARK GENERATED =================
  const markAsGeneratedServerSide = async (ids: string[]) => {
    try {
      await Promise.all(
        ids.map((id) =>
          api.patch(`/assets/${encodeURIComponent(id)}`, {
            qrGenerated: true,
          }),
        ),
      );

      setRecentAssets((prev) =>
        prev.filter((a) => !a._id || !ids.includes(a._id)),
      );
      setSelectedIds({});
    } catch (err) {
      console.error("Failed to mark QR generated", err);
    }
  };

  // ================= PRINT (RECENT & SPECIFIC) =================
  const openPrintView = async (assets: AssetMinimal[]) => {
    if (!assets.length) return setActionMessage("No assets selected");

    const htmlParts = assets.map(
      (a) => `
      <div style="display:inline-block;width:220px;padding:12px;text-align:center;border:1px solid #eee;margin:8px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;">${escapeHtml(
          a.name || a.assetId || "",
        )}</div>
        <img src="${generateQRCodeURL(a.assetId || a._id || "")}" style="width:180px;height:180px;" />
        <div style="font-size:11px;margin-top:8px;">${escapeHtml(
          a.assetId || a._id || "",
        )}</div>
        <div style="font-size:11px;color:#666;">${escapeHtml(
          a.departmentName || "",
        )}</div>
      </div>`,
    );

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return setActionMessage("Popup blocked");

    win.document.write(`
      <html>
        <body style="font-family:system-ui;padding:16px">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
          <div>${htmlParts.join("")}</div>
        </body>
      </html>
    `);
    win.document.close();

    if (mode === "recent") {
      const ids = assets.filter((a) => a._id).map((a) => a._id!);
      await markAsGeneratedServerSide(ids);
    }
  };

  // ================= DOWNLOAD (RECENT & SPECIFIC) =================
  const downloadPNGs = async (assets: AssetMinimal[]) => {
    if (!assets.length) return setActionMessage("No assets selected");
    setLoading(true);
    try {
      for (const a of assets) {
        const res = await fetch(generateQRCodeURL(a.assetId || a._id || ""));
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${a.assetId || a._id}_qr.png`;
        link.click();
        URL.revokeObjectURL(url);
        await sleep(300);
      }

      if (mode === "recent") {
        const ids = assets.filter((a) => a._id).map((a) => a._id!);
        await markAsGeneratedServerSide(ids);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ THESE TWO WERE MISSING (CAUSE OF RED ERRORS)
  const handleSpecificPrint = (a: AssetMinimal | null) => {
    if (!a) return;
    openPrintView([a]);
  };

  const handleSpecificDownload = async (a: AssetMinimal | null) => {
    if (!a) return;
    await downloadPNGs([a]);
  };

  // ================= HELPERS =================
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const escapeHtml = (s?: string) =>
    s
      ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      : "";

  const pickSpecific = (a: AssetMinimal) => {
    setSelectedAsset(a);
    setQuery("");
  };

  // UI
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">QR Generator</h1>
        <p className="text-gray-600 mt-1">
          Generate and print QR codes for assets — recently added or specific
          ones.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMode("recent")}
            className={`px-3 py-2 rounded ${mode === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Recently added
          </button>
          <button
            onClick={() => setMode("specific")}
            className={`px-3 py-2 rounded ${mode === "specific" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Specific asset
          </button>
        </div>
      </div>

      {mode === "recent" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-700">
                  Recently added (not QR-generated)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 border rounded text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Select all
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 border rounded text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : recentAssets.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No recent un-generated assets found.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAssets.map((a) => (
                    <div
                      key={a._id || a.assetId}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelect(a._id)}
                          className="p-1"
                          aria-label="toggle"
                        >
                          {a._id && selectedIds[a._id] ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium text-gray-900">
                            {a.name || a.assetId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {a.assetId} • {a.departmentName || "—"} •{" "}
                            {a.createdAt
                              ? new Date(a.createdAt).toLocaleDateString()
                              : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={generateQRCodeURL(a.assetId || a._id || "")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" /> Open QR
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Selected: {Object.values(selectedIds).filter(Boolean).length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPrintView(getSelectedAssets())}
                  disabled={loading || getSelectedAssets().length === 0}
                  className="px-3 py-2 bg-white border rounded text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Open Print View
                </button>

                <button
                  onClick={() => downloadPNGs(getSelectedAssets())}
                  disabled={loading || getSelectedAssets().length === 0}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download PNGs
                </button>
              </div>
            </div>

            {actionMessage && (
              <div className="text-sm text-gray-700">{actionMessage}</div>
            )}
          </div>

          {/* Right pane: preview of currently selected asset(s) */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-700 mb-2">Preview</div>
              {getSelectedAssets().length === 0 ? (
                <div className="text-sm text-gray-500">
                  Select assets to preview QR
                </div>
              ) : (
                <div className="space-y-3">
                  {getSelectedAssets()
                    .slice(0, 6)
                    .map((a) => (
                      <div
                        key={a._id || a.assetId}
                        className="flex items-center gap-3"
                      >
                        <img
                          src={generateQRCodeURL(a.assetId || a._id || "")}
                          alt="qr"
                          className="w-20 h-20 object-contain bg-white border"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {a.name || a.assetId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {a.assetId}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
              Tip: Use "Open Print View" to open a printable page with many QR
              codes and print them on sticker paper.
            </div>
          </div>
        </div>
      ) : (
        // Specific mode
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className="w-205 pl-10 pr-3 py-2 border rounded"
                placeholder="Search by asset id or name..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                }}
                className="px-8 py-2 border rounded text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Department filter */}
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                }}
                className="px-8 py-2 border rounded text-sm bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            {loadingSpecific ? (
              <div className="text-sm text-gray-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="border rounded mt-2 max-h-56 overflow-auto">
                {searchResults.map((r) => (
                  <div
                    key={r._id || r.assetId}
                    onClick={() => pickSpecific(r)}
                    className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {r.name || r.assetId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.assetId} • {r.departmentName}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedAsset ? (
              <div className="mt-4 flex gap-4 items-center">
                <img
                  src={generateQRCodeURL(
                    selectedAsset.assetId || selectedAsset._id || "",
                  )}
                  alt="qr"
                  className="w-36 h-36 object-contain bg-white border"
                />
                <div>
                  <div className="text-lg font-medium">
                    {selectedAsset.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedAsset.assetId}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleSpecificPrint(selectedAsset)}
                      className="px-3 py-2 border rounded text-sm flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => handleSpecificDownload(selectedAsset)}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 mt-3">
                Search and choose an asset to preview its QR.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenPage;
