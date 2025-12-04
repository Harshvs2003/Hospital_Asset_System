// src/pages/AddAssetsPage.tsx
import React, { useState } from "react";
import { post } from "../lib/api"; // adjust path if your api is in a different folder

interface AssetFormData {
  name: string;
  category: string;
  subcategory: string;
  status: string;
  location: string;
  installdate?: string;
  purchaseDate?: string;
  servicedate?: string;
  contractExpiryDate?: string;
  departmentId?: string;
  departmentName?: string;
}

const initialForm: AssetFormData = {
  name: "",
  category: "",
  subcategory: "",
  status: "Available",
  location: "",
  purchaseDate: "",
  servicedate: "",
  contractExpiryDate: "",
  departmentId: "",
  departmentName: "",
};

const AddAssetsPage: React.FC = () => {
  const [formData, setFormData] = useState<AssetFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const categories = [
    { name: "Furniture", subcategories: ["Table", "Chair", "Cabinet"] },
    { name: "Beds", subcategories: ["ICU Bed", "Regular Bed", "Stretcher"] },
    { name: "Machines", subcategories: ["ECG", "Ventilator", "Monitor"] },
    { name: "Electrical", subcategories: ["Light", "Fan", "Generator"] },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // use post helper; this hits `${API_BASE}/api/assets`
      const data = await post("/assets", formData);

      // expecting backend to return something like { assetId: '...' } (keep as before)
      setMessage(`✅ Asset added successfully! ID: ${data.assetId ?? data.id ?? "N/A"}`);
      setFormData(initialForm);
    } catch (err: any) {
      // axios error normalization
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add asset. Try again.";
      setMessage(`❌ Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.name === formData.category);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Add New Asset</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Hospital Bed, Monitor"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory *
              </label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subcategory</option>
                {selectedCategory.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Available">Available</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Damaged">Damaged</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ward 301, Store Room"
            />
          </div>

          {/* Install Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Install Date (Optional)
            </label>
            <input
              type="date"
              name="installdate"
              value={formData.installdate ?? ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date (Optional)</label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate ?? ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Last Service Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Date (Optional)</label>
            <input
              type="date"
              name="servicedate"
              value={formData.servicedate ?? ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contract Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Expiry Date (Optional)</label>
            <input
              type="date"
              name="contractExpiryDate"
              value={formData.contractExpiryDate ?? ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department ID (Optional)
            </label>
            <input
              type="text"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., DEPT001, ICU, OR"
            />
          </div>

          {/* Department Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name (Optional)
            </label>
            <input
              type="text"
              name="departmentName"
              value={formData.departmentName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ICU, Operating Room, Emergency"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? "Adding..." : "Add Asset"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAssetsPage;
