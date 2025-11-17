import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, Funnel } from "lucide-react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";


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
  createdAt?: string;
  assignedTo?: string;
  departmentId?: string;
  departmentName?: string;
};

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("All");
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("All");
  const navigate = useNavigate();

  React.useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/assets`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAssets(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch assets:", err);
        setError("Failed to load assets");
        setLoading(false);
      });
  }, []);

  const categories = Array.from(new Set(assets.map((a) => a.category || "").filter(Boolean)));
  const statuses = Array.from(new Set(assets.map((a) => a.status || "").filter(Boolean)));
  const departments = Array.from(new Set(assets.map((a) => a.departmentName || "").filter(Boolean)));

  const filteredByAll = assets.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (a.assetId || "").toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.category || "").toLowerCase().includes(q) ||
      (a.location || "").toLowerCase().includes(q);

    const matchesCategory = selectedCategory === "All" || (a.category || "") === selectedCategory;
    const matchesStatus = selectedStatus === "All" || (a.status || "") === selectedStatus;
    const matchesDepartment = selectedDepartment === "All" || (a.departmentName || "") === selectedDepartment;

    return matchesQuery && matchesCategory && matchesStatus && matchesDepartment;
  });

  const fmtNumber = (n: number) => n.toLocaleString();

  const statusBadge = (s?: string) => {
    const status = (s || "").toLowerCase();
    switch (status) {
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

  // Pagination state (UI-only, non-invasive)
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredByAll.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = filteredByAll.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (s?: string) => statusBadge(s);

  const onViewAsset = (asset: Asset | any) => {
    navigate(`/assets/${asset.assetId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Asset Inventory</h1>
        <p className="text-gray-600 mt-1">
          Showing {fmtNumber(filteredByAll.length)} of {fmtNumber(assets.length)} assets
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, name, or location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Funnel className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="All">Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="All">Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="All">Department</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading assets...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredByAll.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No assets found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unique ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAssets.map((a) => (
                  <tr key={a._id || a.assetId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.assetId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {a.storeindate ? new Date(a.storeindate).toISOString().slice(0, 10) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(a.status)}`}>
                        {a.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.assignedTo || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.departmentName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => onViewAsset(a)} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredByAll.length)} of {filteredByAll.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsPage;
