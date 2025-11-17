import React from "react";
import { useLocation } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5173";


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
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // fetch assets for selection
    setLoading(true);
    fetch(`${API_BASE}/api/assets`)
      .then((res) => res.json())
      .then((data) => {
        setAssets(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load assets:", err);
        setError("Failed to load assets");
        setLoading(false);
      });
  }, []);

  // Preselect assetId from query param if provided (e.g., /complain?assetId=NH...)
  const location = useLocation();
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aid = params.get("assetId");
    if (aid) setSelectedAssetId(aid);
  }, [location.search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const payload = {
      type: complaintType,
      description,
      assetId: selectedAssetId || null,
    };

    setLoading(true);
    fetch(`${API_BASE}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        setLoading(false);
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setSubmitted(true);
        setComplaintType("");
        setDescription("");
        setFiledBy("");
        setSelectedAssetId("");
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to submit complaint:", err);
        setError("Failed to submit complaint. Please try again.");
        setSubmitted(false);
        setLoading(false);
      });
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Type *</label>
              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="Equipment Malfunction">Equipment Malfunction</option>
                <option value="Missing Asset">Missing Asset</option>
                <option value="Quality Issue">Quality Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Asset (optional)</label>
              {loading ? (
                <div className="text-sm text-gray-500">Loading assets...</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : (
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select asset (optional) --</option>
                  {assets.map((a) => (
                    <option key={a._id || a.assetId} value={a.assetId}>
                      {a.assetId ? `${a.assetId} — ${a.name || a.category || "Unnamed"}` : a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Complain Filed By:</label>
              <input
                value={filedBy}
                onChange={(e) => setFiledBy(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your complaint in detail..."
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition">
              Submit Complaint
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ComplainPage;
