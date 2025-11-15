import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, DollarSign, QrCode } from "lucide-react";

/**
 * Local fallback QR generator helper (used if ../utils/qrcode is not present).
 * It returns a public QR image URL from qrserver; adjust the target URL or API as needed.
 */
const generateQRCodeURL = (assetId: string) => {
  const payload = assetId || "unknown";
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://example.com";
  const target = `${origin}/asset/${encodeURIComponent(payload)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(target)}`;
};

type Asset = {
  _id?: string;
  assetId?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  status?: string;
  storeindate?: string;
  installdate?: string;
  purchaseDate?: string;
  lastServiceDate?: string;
  contractExpiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
  price?: number;
  assignedTo?: string;
};

type Complaint = {
  _id?: string;
  assetId?: string;
  type?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  resolvedAt?: string | null;
};

const AssetDetails: React.FC = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = React.useState(false);

  // action state for quick actions
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    fetch(`http://localhost:5000/api/assets/byAssetId/${assetId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAsset(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load asset:", err);
        setError("Failed to load asset details");
        setLoading(false);
      });

    // fetch complaints
    setComplaintsLoading(true);
    fetch(`http://localhost:5000/api/complaints?assetId=${assetId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setComplaints(Array.isArray(data) ? data : []);
        setComplaintsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load complaints:", err);
        setComplaints([]);
        setComplaintsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const getStatusColor = (status?: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "in-use":
      case "in use":
        return "bg-green-100 text-green-800";
      case "installed":
        return "bg-blue-100 text-blue-800";
      case "in-store":
      case "in store":
        return "bg-gray-100 text-gray-800";
      case "damaged":
      case "out of order":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  // build chronological events: installation/received + complaints
  const events: Array<{
    id: string;
    title: string;
    location?: string;
    by?: string;
    date?: string | null;
    description?: string;
  }> = [];

  if (asset) {
    const receivedDate = asset.storeindate || asset.installdate || asset.createdAt || null;
    events.push({
      id: `received-${asset._id || asset.assetId}`,
      title: "Asset received and registered",
      location: asset.location,
      by: "Admin",
      date: receivedDate,
    });

    // map complaints to events
    complaints.forEach((c) => {
      events.push({
        id: c._id || `c-${Math.random()}`,
        title: c.type || "Complaint filed",
        location: undefined,
        by: undefined,
        date: c.createdAt || null,
        description: c.description,
      });
    });

    // if the asset has installdate, add it as an event
    if (asset.installdate) {
      events.push({
        id: `installed-${asset._id || asset.assetId}`,
        title: "Installed",
        location: asset.location,
        by: "Installer",
        date: asset.installdate,
      });
    }

    // sort ascending by date (oldest first)
    events.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
  }

  // helper to extract YYYY-MM-DD from either ISO or backend-formatted IST date strings
  const shortDate = (d?: string | null) => {
    if (!d) return "-";
    // backend returns 'YYYY-MM-DD HH:mm:ss' (IST) — handle that
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch (e) {
      return String(d).slice(0, 10);
    }
  };

  // --- Quick action helpers ---

  const downloadQRCode = async () => {
    if (!asset) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const qrSource = generateQRCodeURL(asset.assetId || asset._id || "");
      const res = await fetch(qrSource);
      if (!res.ok) throw new Error("Failed to fetch QR image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(asset.assetId || asset._id || "asset")}_qrcode.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setActionMessage("QR downloaded");
    } catch (err) {
      console.error(err);
      setActionMessage("Failed to download QR");
      alert("Failed to download QR code");
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const patchAsset = async (patch: Partial<Asset>) => {
    if (!asset?._id) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`http://localhost:5000/api/assets/${asset._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      // refresh
      const refreshed = await fetch(`http://localhost:5000/api/assets/byAssetId/${assetId}`);
      if (refreshed.ok) setAsset(await refreshed.json());
      setActionMessage("Updated successfully");
    } catch (err) {
      console.error("Failed to update asset:", err);
      setActionMessage("Update failed");
      alert("Update failed: " + (err as Error).message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleUpdateLocation = async () => {
    if (!asset) return;
    const value = prompt("Enter new location:", asset.location || "");
    if (value === null) return;
    await patchAsset({ location: value });
  };

  const handleChangeStatus = async () => {
    if (!asset) return;
    const value = prompt("Enter new status (e.g., In-Use, Installed, In-Store, Damaged):", asset.status || "");
    if (value === null) return;
    await patchAsset({ status: value });
  };

  const handleAssignTo = async () => {
    if (!asset) return;
    const value = prompt("Assign to (staff name):", asset.assignedTo || "");
    if (value === null) return;
    await patchAsset({ assignedTo: value });
  };

  const handleReportComplaint = async () => {
    if (!asset) return;
    const type = prompt("Complaint type (short):", "General");
    if (type === null) return;
    const description = prompt("Describe the issue (details):", "");
    if (description === null) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`http://localhost:5000/api/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset._id,
          type,
          description,
          raisedByUserName: "Device User",
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      // refresh complaints
      const compRes = await fetch(`http://localhost:5000/api/complaints?assetId=${assetId}`);
      if (compRes.ok) setComplaints(Array.isArray(await compRes.json()) ? await compRes.json() : []);
      setActionMessage("Complaint submitted");
    } catch (err) {
      console.error("Failed to submit complaint:", err);
      setActionMessage("Complaint failed");
      alert("Failed to submit complaint: " + (err as Error).message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900">{asset?.name || "Asset"}</h1>
        {asset?.assetId && <div className="text-sm text-gray-600 mt-1 font-mono">{asset.assetId}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / main column (Asset info + history) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>

            {!asset ? (
              loading ? (
                <div className="text-sm text-gray-500">Loading asset...</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : (
                <div className="text-sm text-gray-500">Asset not found.</div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500">Asset Name</div>
                  <div className="font-medium text-gray-900">{asset.name}</div>

                  <div className="mt-4 text-xs text-gray-500">Category</div>
                  <div className="font-medium text-gray-900">{asset.category || "-"}</div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> Current Location
                  </div>
                  <div className="font-medium text-gray-900">{asset.location || "-"}</div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" /> Asset Value
                  </div>
                  <div className="font-medium text-gray-900">
                    {typeof asset.price === "number" ? `$${asset.price.toLocaleString()}` : "-"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Unique ID</div>
                  <div className="font-medium text-gray-900">{asset.assetId || asset._id || "-"}</div>

                  <div className="mt-4 text-xs text-gray-500">Status</div>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(asset?.status)}`}>
                      {asset?.status || "Unknown"}
                    </span>
                  </div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> Date Received
                  </div>
                  <div className="font-medium text-gray-900">{shortDate(asset?.storeindate || asset?.createdAt)}</div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> Purchase Date
                  </div>
                  <div className="font-medium text-gray-900">{shortDate(asset?.purchaseDate)}</div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> Service Date
                  </div>
                  <div className="font-medium text-gray-900">{shortDate(asset?.lastServiceDate)}</div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> Contract Expiry
                  </div>
                  <div className="font-medium text-gray-900">{shortDate(asset?.contractExpiryDate)}</div>

                  <div className="mt-4 text-xs text-gray-500">Assigned To</div>
                  <div className="font-medium text-gray-900">{asset?.assignedTo || "-"}</div>
                </div>
              </div>
            )}
          </div>

          {/* Asset History — timeline style like the first component */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Asset History</h3>
              <div className="text-sm text-gray-500">{asset?.installdate ? shortDate(asset.installdate) : ""}</div>
            </div>

            <div className="mt-4">
              {(!asset || (events.length === 0 && !complaintsLoading)) ? (
                <div className="text-sm text-gray-500">No history available.</div>
              ) : (
                <div className="space-y-4 mt-3">
                  {events.map((ev, index) => (
                    <div key={ev.id} className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        {index < events.length - 1 && <div className="w-0.5 h-full bg-gray-300 mt-1"></div>}
                      </div>

                      <div className="pb-8 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                          <span className="text-xs text-gray-500">{ev.date ? shortDate(ev.date) : ""}</span>
                        </div>

                        {ev.location && (
                          <p className="text-xs text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {ev.location}
                          </p>
                        )}

                        {ev.description && <p className="text-sm text-gray-700 mt-1">{ev.description}</p>}

                        <p className="text-xs text-gray-500 mt-1">By: {ev.by || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right / sticky sidebar (QR + quick actions + complaints) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6 space-y-4">
            <div className="flex items-center mb-2">
              <QrCode className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-900">Asset QR Code</h4>
            </div>

            {asset ? (
              <>
                <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
                  <img
                    src={generateQRCodeURL(asset.assetId || asset._id || "unknown")}
                    alt="Asset QR Code"
                    className="w-44 h-44 mb-4"
                  />
                  <p className="text-sm font-medium text-gray-900 mb-1 font-mono">{asset.assetId || asset._id || "-"}</p>
                  <p className="text-xs text-gray-600 text-center mb-4">Scan to access asset details instantly</p>
                  <button
                    onClick={downloadQRCode}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {actionLoading ? "Processing..." : "Download QR Code"}
                  </button>
                </div>

                <div className="mt-2 p-4 bg-blue-50 rounded-lg w-full">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h5>
                  <div className="space-y-2">
                    <button
                      onClick={handleUpdateLocation}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Update Location
                    </button>
                    <button
                      onClick={handleChangeStatus}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Change Status
                    </button>
                    <button
                      onClick={handleAssignTo}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Assign to Staff
                    </button>
                    <button
                      onClick={handleReportComplaint}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 text-sm text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Report Complaint
                    </button>
                  </div>
                </div>

                {actionMessage && <div className="text-sm text-gray-700 text-center">{actionMessage}</div>}

                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Complaints</h5>
                  {complaintsLoading ? (
                    <div className="text-sm text-gray-500">Loading complaints...</div>
                  ) : complaints.length === 0 ? (
                    <div className="text-sm text-gray-500">No complaints</div>
                  ) : (
                    <ul className="space-y-2 w-full">
                      {complaints.map((c) => (
                        <li key={c._id} className="p-2 border rounded bg-gray-50 text-sm">
                          <div className="font-medium text-gray-900">{c.type}</div>
                          <div className="text-xs text-gray-600">{c.description}</div>
                          <div className="text-xs text-gray-500 mt-1">Status: {c.status}</div>
                          <div className="text-xs text-gray-400 mt-1">{shortDate(c.createdAt)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Loading QR...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
