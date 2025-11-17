// src/pages/qrgen.tsx
import React from "react";
import { Search, Download, Printer, CheckSquare, Square } from "lucide-react";
import { generateQRCodeURL } from "../utils/qrcode.ts"; // optional import if you have it
// If you don't have ../utils/qrcode, the local helper below will be used.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";



type AssetMinimal = {
  _id?: string;
  assetId?: string;
  name?: string;
  departmentName?: string;
  createdAt?: string;
  qrGenerated?: boolean;
};

const QRGenPage: React.FC = () => {
  const [mode, setMode] = React.useState<"recent" | "specific">("recent");
  const [recentAssets, setRecentAssets] = React.useState<AssetMinimal[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  // for Specific mode
  const [query, setQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<AssetMinimal[]>([]);
  const [selectedAsset, setSelectedAsset] = React.useState<AssetMinimal | null>(null);
  const [fetchingSearch, setFetchingSearch] = React.useState(false);

  React.useEffect(() => {
    if (mode === "recent") fetchRecentAssets();
  }, [mode]);

  // Fetch recent assets — backend SHOULD provide an endpoint to return new assets that don't have QR generated
  // Try: GET /api/assets/recent
  // Fallback: GET /api/assets?limit=50 and filter by qrGenerated:false or by createdAt recent
  const fetchRecentAssets = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      let res = await fetch(`${API_BASE}/api/assets/recent`);
      if (!res.ok) {
        // fallback: get latest 100 and filter client-side
        res = await fetch(`${API_BASE}/api/assets?per=100&sort=createdAt_desc`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Expect objects with at least: _id, assetId, name, createdAt, qrGenerated?
      const arr: AssetMinimal[] = Array.isArray(data) ? data : [];
      // Filter to only those that are not qrGenerated if backend didn't do it
      const filtered = arr.filter((a) => !a.qrGenerated);
      setRecentAssets(filtered);
      setSelectedIds({});
    } catch (err) {
      console.error("Failed to load recent assets:", err);
      setActionMessage("Failed to load recent assets");
      setRecentAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // Simple search for specific asset by id or name. Backend: GET /api/assets?search=...
  const doSearch = async (q: string) => {
    if (!q) {
      setSearchResults([]);
      return;
    }
    setFetchingSearch(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets?search=${encodeURIComponent(q)}&per=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setFetchingSearch(false);
    }
  };

  // Toggle selection for recently added list
  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    recentAssets.forEach((a) => {
      if (a._id) all[a._id] = true;
    });
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds({});

  // generate printable window that contains all selected QR images and auto-print (user can cancel)
  const openPrintView = async (assets: AssetMinimal[]) => {
    if (!assets.length) return setActionMessage("No assets selected");
    // Build HTML with images referencing QR server (no need to fetch blobs)
    const htmlParts = assets.map(
      (a) => `
      <div style="display:inline-block;width:220px;padding:12px;text-align:center;box-sizing:border-box;border:1px solid #eee;margin:8px;">
        <div style="font-size:12px;color:#222;font-weight:600;margin-bottom:8px;">${escapeHtml(a.name || a.assetId || "")}</div>
        <img src="${generateQRCodeURL(a.assetId || a._id || "")}" style="width:180px;height:180px;object-fit:contain;" />
        <div style="font-family:monospace;font-size:11px;color:#333;margin-top:8px;">${escapeHtml(a.assetId || a._id || "")}</div>
        <div style="font-size:11px;color:#666;">${escapeHtml(a.departmentName || "")}</div>
      </div>
    `
    );
    const html = `
      <html>
        <head>
          <title>Print QRs</title>
          <style>
            @media print { body { -webkit-print-color-adjust: exact; } .no-print { display:none; } }
            body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 18px; }
          </style>
        </head>
        <body>
          <div style="margin-bottom:12px;">
            <button onclick="window.print()" style="padding:8px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-right:8px;">Print</button>
            <button onclick="window.close()" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;cursor:pointer;">Close</button>
          </div>
          <div>${htmlParts.join("")}</div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
    if (!win) {
      setActionMessage("Popup blocked — allow popups for printing");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // Download each QR image as PNG using the QR server URL
  const downloadPNGs = async (assets: AssetMinimal[]) => {
    if (!assets.length) return setActionMessage("No assets selected");
    setActionMessage(null);
    setLoading(true);
    try {
      for (const a of assets) {
        const qrUrl = generateQRCodeURL(a.assetId || a._id || "");
        try {
          const res = await fetch(qrUrl);
          if (!res.ok) {
            console.warn("Failed to fetch QR for", a.assetId || a._id);
            continue;
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const aEl = document.createElement("a");
          aEl.href = url;
          const name = `${(a.assetId || a._id || "asset")}_qrcode.png`;
          aEl.download = name;
          document.body.appendChild(aEl);
          aEl.click();
          aEl.remove();
          URL.revokeObjectURL(url);
          // small throttle so browser can handle multiple downloads
          await sleep(300);
        } catch (err) {
          console.error("Download failed for", a, err);
        }
      }
      setActionMessage("Downloads started");
      // After downloads, mark assets as generated (if in recent mode)
      const toPatch = assets.filter((x) => x._id).map((x) => x._id!) ;
      if (mode === "recent" && toPatch.length) await markAsGeneratedServerSide(toPatch);
    } catch (err) {
      console.error(err);
      setActionMessage("Failed to download some QR images");
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Mark assets as qrGenerated on the server (PATCH). Backend should support updating { qrGenerated: true }
  // Endpoint used: PATCH /api/assets/:id with body { qrGenerated: true }
  // If your backend uses a different field or route, change this.
  const markAsGeneratedServerSide = async (ids: string[]) => {
    try {
      // parallel but limited
      await Promise.all(
        ids.map((id) =>
          fetch(`${API_BASE}/api/assets/byAssetId/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrGenerated: true }),
          }).then((r) => {
            if (!r.ok) console.warn("Failed to mark generated for", id);
            return r;
          })
        )
      );
      // refresh recent list
      await fetchRecentAssets();
    } catch (err) {
      console.error("Failed to update generated flags:", err);
    }
  };

  // Helper: build selected assets array
  const getSelectedAssets = (): AssetMinimal[] => {
    const sel = recentAssets.filter((a) => a._id && selectedIds[a._id!]);
    return sel;
  };

  // Small utility helpers
  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
  function escapeHtml(str?: string) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Specific mode: when user clicks a search result
  const pickSpecific = (a: AssetMinimal) => {
    setSelectedAsset(a);
    setSearchResults([]);
    setQuery("");
  };

  // Specific mode: download or print single asset
  const handleSpecificDownload = async (a: AssetMinimal | null) => {
    if (!a) return setActionMessage("No asset selected");
    await downloadPNGs([a]);
  };
  const handleSpecificPrint = (a: AssetMinimal | null) => {
    if (!a) return setActionMessage("No asset selected");
    openPrintView([a]);
  };

  // UI
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">QR Generator</h1>
        <p className="text-gray-600 mt-1">Generate and print QR codes for assets — recently added or specific ones.</p>
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
                <div className="text-sm text-gray-700">Recently added (not QR-generated)</div>
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
                <div className="text-sm text-gray-500">No recent un-generated assets found.</div>
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
                          <div className="font-medium text-gray-900">{a.name || a.assetId}</div>
                          <div className="text-xs text-gray-500">
                            {a.assetId} • {a.departmentName || "—"} •{" "}
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
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

            {actionMessage && <div className="text-sm text-gray-700">{actionMessage}</div>}
          </div>

          {/* Right pane: preview of currently selected asset(s) */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-700 mb-2">Preview</div>
              {getSelectedAssets().length === 0 ? (
                <div className="text-sm text-gray-500">Select assets to preview QR</div>
              ) : (
                <div className="space-y-3">
                  {getSelectedAssets().slice(0, 6).map((a) => (
                    <div key={a._id || a.assetId} className="flex items-center gap-3">
                      <img
                        src={generateQRCodeURL(a.assetId || a._id || "")}
                        alt="qr"
                        className="w-20 h-20 object-contain bg-white border"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{a.name || a.assetId}</div>
                        <div className="text-xs text-gray-500">{a.assetId}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
              Tip: Use "Open Print View" to open a printable page with many QR codes and print them on sticker paper.
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
                className="w-full pl-10 pr-3 py-2 border rounded"
                placeholder="Search by asset id or name..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  doSearch(e.target.value);
                }}
              />
            </div>

            <div>
              <button
                onClick={() => {
                  if (selectedAsset) {
                    handleSpecificPrint(selectedAsset);
                  } else if (query) {
                    doSearch(query);
                  }
                }}
                className="px-3 py-2 bg-white border rounded text-sm"
              >
                Print / Search
              </button>
              <button
                onClick={() => handleSpecificDownload(selectedAsset)}
                className="ml-2 px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2"
                disabled={!selectedAsset}
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="mt-3">
            {fetchingSearch ? (
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
                      <div className="font-medium text-gray-900">{r.name || r.assetId}</div>
                      <div className="text-xs text-gray-500">{r.assetId} • {r.departmentName}</div>
                    </div>
                    <div className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</div>
                  </div>
                ))}
              </div>
            ) : selectedAsset ? (
              <div className="mt-4 flex gap-4 items-center">
                <img src={generateQRCodeURL(selectedAsset.assetId || selectedAsset._id || "")} alt="qr" className="w-36 h-36 object-contain bg-white border" />
                <div>
                  <div className="text-lg font-medium">{selectedAsset.name}</div>
                  <div className="text-xs text-gray-500">{selectedAsset.assetId}</div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleSpecificPrint(selectedAsset)} className="px-3 py-2 border rounded text-sm flex items-center gap-2">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={() => handleSpecificDownload(selectedAsset)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 mt-3">Search and choose an asset to preview its QR.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default QRGenPage;