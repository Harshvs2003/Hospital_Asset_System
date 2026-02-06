// src/pages/AssetDetails.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, DollarSign, QrCode } from "lucide-react";
import { generateQRCodeURL } from "../utils/qrcode";
import api, { get } from "../lib/api"; // <-- uses centralized api helpers
import AssetHistoryTimeline from "../components/AssetHistoryTimeline";

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
  departmentId?: string;
  departmentName?: string;
  createdAt?: string;
  updatedAt?: string;
  price?: number;
  assignedTo?: string;
  history?: Array<any>;
};

type Complaint = {
  _id?: string;
  assetId?: string;
  type?: string;
  description?: string;
  status?: "OPEN" | "SUPERVISOR_RESOLVED" | "CLOSED";
  createdAt?: string;
  supervisorResolvedAt?: string | null;
};

const priceFmt = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n) : "-";

const AssetDetails: React.FC = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeComplaint, setActiveComplaint] = React.useState<Complaint | null>(null);
  const [complaintsLoading, setComplaintsLoading] = React.useState(false);

  // action state for quick actions
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  // modal state for quick-action popups
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = React.useState(false);
  const [locationModalValue, setLocationModalValue] = React.useState("");
  const [statusModalValue, setStatusModalValue] = React.useState("");
  const [assignModalValue, setAssignModalValue] = React.useState("");
  const [departmentIdModalValue, setDepartmentIdModalValue] = React.useState("");
  const [departmentNameModalValue, setDepartmentNameModalValue] = React.useState("");

  React.useEffect(() => {
    if (!assetId) return;
    fetchAsset();
    fetchActiveComplaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const fetchAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      // use get helper -> hits `${API_BASE}/api/assets/byAssetId/${assetId}`
      const data = await get(`/assets/byAssetId/${assetId}`);
      setAsset(data);
    } catch (err) {
      console.error("Failed to load asset:", err);
      setError("Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveComplaint = async () => {
    if (!assetId) return;
    setComplaintsLoading(true);
    try {
      const data = await get(`/complaints/active/byAsset/${encodeURIComponent(String(assetId))}`);
      const complaint = data?.data || null;
      setActiveComplaint(complaint);
    } catch (err) {
      console.error("Failed to load complaints:", err);
      setActiveComplaint(null);
    } finally {
      setComplaintsLoading(false);
    }
  };

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

  // helper to extract YYYY-MM-DD
  const shortDate = (d?: string | null) => {
    if (!d) return "-";
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
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
      // use axios instance directly for PATCH
      await api.patch(`/assets/${asset._id}`, patch);
      await fetchAsset();
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

  // Open a modal to update location
  const handleUpdateLocation = () => {
    setLocationModalValue(asset?.location || "");
    setShowLocationModal(true);
  };

  // Open a modal to change status
  const handleChangeStatus = () => {
    setStatusModalValue(asset?.status || "");
    setShowStatusModal(true);
  };

  // Open a modal to assign to staff
  const handleAssignTo = () => {
    setAssignModalValue(asset?.assignedTo || "");
    setShowAssignModal(true);
  };

  // Open a modal to update department
  const handleUpdateDepartment = () => {
    setDepartmentIdModalValue(asset?.departmentId || "");
    setDepartmentNameModalValue(asset?.departmentName || "");
    setShowDepartmentModal(true);
  };

  const handleReportComplaint = async () => {
    if (!asset) return;
    // Navigate to the complaint page with this asset preselected
    const aid = asset.assetId || asset._id || "";
    navigate(`/complain?assetId=${encodeURIComponent(aid)}`);
  };

  const handleViewComplaint = () => {
    if (!activeComplaint?._id) return;
    navigate(`/complaints/${activeComplaint._id}`);
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
                  <div className="font-medium text-gray-900">{priceFmt(asset.price)}</div>
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

                  <div className="mt-4 text-xs text-gray-500">Department ID</div>
                  <div className="font-medium text-gray-900">{asset?.departmentId || "-"}</div>

                  <div className="mt-4 text-xs text-gray-500">Department Name</div>
                  <div className="font-medium text-gray-900">{asset?.departmentName || "-"}</div>
                </div>
              </div>
            )}
          </div>

          {/* Asset History */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Asset History</h3>
              <div className="text-sm text-gray-500">{asset?.installdate ? shortDate(asset.installdate) : ""}</div>
            </div>

            <div className="mt-4">
              {!asset ? (
                <div className="text-sm text-gray-500">No history available.</div>
              ) : (
                <div className="mt-3">
                  <AssetHistoryTimeline history={(asset.history || []) as any} />
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
                    className="w-44 h-44 mb-4 object-contain"
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
                      onClick={handleUpdateDepartment}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Update Department
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

                  {/* Modals for quick actions */}
                  {showLocationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowLocationModal(false)} />
                      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-96">
                        <h4 className="text-lg font-semibold mb-2">Update Location</h4>
                        <input
                          value={locationModalValue}
                          onChange={(e) => setLocationModalValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded mb-4"
                          placeholder="New location"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await patchAsset({ location: locationModalValue });
                              setShowLocationModal(false);
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                          >
                            Save
                          </button>
                          <button onClick={() => setShowLocationModal(false)} className="px-4 py-2 border rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showStatusModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowStatusModal(false)} />
                      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-96">
                        <h4 className="text-lg font-semibold mb-2">Change Status</h4>
                        <input
                          value={statusModalValue}
                          onChange={(e) => setStatusModalValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded mb-4"
                          placeholder="e.g., In-Use, Installed, In-Store, Damaged"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await patchAsset({ status: statusModalValue });
                              setShowStatusModal(false);
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                          >
                            Save
                          </button>
                          <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 border rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowAssignModal(false)} />
                      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-96">
                        <h4 className="text-lg font-semibold mb-2">Assign To</h4>
                        <input
                          value={assignModalValue}
                          onChange={(e) => setAssignModalValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded mb-4"
                          placeholder="Staff member name"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await patchAsset({ assignedTo: assignModalValue });
                              setShowAssignModal(false);
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                          >
                            Save
                          </button>
                          <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showDepartmentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowDepartmentModal(false)} />
                      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-96">
                        <h4 className="text-lg font-semibold mb-4">Update Department</h4>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Department ID</label>
                          <input
                            value={departmentIdModalValue}
                            onChange={(e) => setDepartmentIdModalValue(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="e.g., DEPT001"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                          <input
                            value={departmentNameModalValue}
                            onChange={(e) => setDepartmentNameModalValue(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="e.g., ICU, Operating Room"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await patchAsset({ 
                                departmentId: departmentIdModalValue,
                                departmentName: departmentNameModalValue
                              });
                              setShowDepartmentModal(false);
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                          >
                            Save
                          </button>
                          <button onClick={() => setShowDepartmentModal(false)} className="px-4 py-2 border rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Active Complaint</h5>
                  {complaintsLoading ? (
                    <div className="text-sm text-gray-500">Loading complaint...</div>
                  ) : !activeComplaint ? (
                    <div className="text-sm text-gray-500">No active complaints</div>
                  ) : (
                    <div className="p-3 border rounded bg-gray-50 text-sm space-y-2">
                      <div className="font-medium text-gray-900">{activeComplaint.type}</div>
                      <div className="text-xs text-gray-600">{activeComplaint.description}</div>
                      <div className="text-xs text-gray-500">Status: {activeComplaint.status}</div>
                      <div className="text-xs text-gray-400">{shortDate(activeComplaint.createdAt)}</div>
                      <button
                        onClick={handleViewComplaint}
                        className="w-full px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View Complaint
                      </button>
                    </div>
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
