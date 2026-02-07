import React from "react";
import { useLocation } from "react-router-dom";
import { get, post } from "../lib/api";
import Select from "react-select";
import { useAuth } from "../context/AuthContext";
import { COMPLAINT_TYPES } from "../data/complaintTypes";

type Asset = {
  _id?: string;
  assetId?: string;
  name?: string;
  category?: string;
};

const ComplainPage: React.FC = () => {
  const [complaintType, setComplaintType] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [filedBy, setFiledBy] = React.useState("");
  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();
  const isAdminSupervisor = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await get("/assets");
        if (!mounted) return;
        setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load assets:", err);
        if (!mounted) return;
        setError("Failed to load assets");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const location = useLocation();
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aid = params.get("assetId");
    if (aid) setSelectedAssetId(aid);
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setLoading(true);
    setError(null);

    const payload = {
      type: complaintType,
      description,
      assetId: selectedAssetId || null,
      filedBy: filedBy || undefined,
      departmentId: isAdminSupervisor ? departmentId || undefined : undefined,
    };

    try {
      await post("/complaints", payload);
      setSubmitted(true);
      setComplaintType("");
      setDescription("");
      setFiledBy("");
      setSelectedAssetId("");
      setDepartmentId("");
      setError(null);
    } catch (err: any) {
      console.error("Failed to submit complaint:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit complaint. Please try again.";
      setError(msg);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ react-select options
  const assetOptions = assets.map((a) => ({
    value: a.assetId || "",
    label: `${a.assetId} — ${a.name || a.category || "Unnamed"}`,
  }));

  // ✅ preselect value (when assetId is passed in query param)
  const selectedOption = assetOptions.find(
    (opt) => opt.value === selectedAssetId
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">File a Complaint</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {submitted ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center">
            ✅ Complaint submitted successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complaint Type *
              </label>
              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                {COMPLAINT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Searchable Asset Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Asset (optional)
              </label>

              {loading ? (
                <div className="text-sm text-gray-500">Loading assets...</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : (
                <Select
                  options={assetOptions}
                  value={selectedOption || null}
                  onChange={(selected) =>
                    setSelectedAssetId(selected?.value || "")
                  }
                  isClearable
                  placeholder="Search by Asset ID or Name..."
                  className="text-sm"
                  classNamePrefix="react-select"
                  filterOption={(option, inputValue) => {
                    const search = inputValue.toLowerCase();
                    return option.label.toLowerCase().includes(search);
                  }}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your complaint in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complain Filed By:
              </label>
              <input
                value={filedBy}
                onChange={(e) => setFiledBy(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>

            {isAdminSupervisor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department ID *
                </label>
                <input
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Department ID to file for"
                />
              </div>
            )}

            <div>
              {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ComplainPage;
