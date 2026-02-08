// src/pages/AddAssetsPage.tsx
import React, { useEffect, useState } from "react";
import { post } from "../lib/api"; // adjust path if your api is in a different folder
import { useAuth } from "../context/AuthContext";
import { DEPARTMENTS } from "../data/departments";
import { ASSET_STATUSES } from "../data/assetStatuses";

interface AssetFormData {
  name: string;
  category: string;
  subcategory: string;
  status: string;
  location: string;
  installdate?: string;
  purchaseDate?: string;
  lastServiceDate?: string;
  contractExpiryDate?: string;
  departmentId?: string;
  departmentName?: string;
  reminderService?: {
    enabled: boolean;
    startDays: number | null;
    intervalDays: number | null;
  };
  reminderContract?: {
    enabled: boolean;
    startDays: number | null;
    intervalDays: number | null;
  };
}

const initialForm: AssetFormData = {
  name: "",
  category: "",
  subcategory: "",
  status: "Available",
  location: "",
  purchaseDate: "",
  lastServiceDate: "",
  contractExpiryDate: "",
  departmentId: "",
  departmentName: "",
  reminderService: { enabled: false, startDays: null, intervalDays: null },
  reminderContract: { enabled: false, startDays: null, intervalDays: null },
};

const AddAssetsPage: React.FC = () => {
  const [formData, setFormData] = useState<AssetFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const isDeptUser = user?.role === "DEPARTMENT_USER";
  const isAdminOrSupervisor =
    user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  useEffect(() => {
    if (isDeptUser && user?.departmentId) {
      const dept = DEPARTMENTS.find((d) => d.id === user.departmentId);
      setFormData((prev) => ({
        ...prev,
        departmentId: user.departmentId || "",
        departmentName: dept?.name || prev.departmentName,
      }));
    }
  }, [isDeptUser, user?.departmentId]);

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

  const getIntervalOptions = (startDays: number | null) => {
    if (startDays === 7) return [1];
    if (startDays === 15) return [1, 2];
    if (startDays === 30) return [1, 3, 5];
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    setLoading(true);
    setMessage("");

    try {
      // use post helper; this hits `${API_BASE}/api/assets`
      const payload = {
        ...formData,
      };
      const data = await post("/assets", payload);

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
  const selectedDepartment = DEPARTMENTS.find(
    (d) => d.id === formData.departmentId
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Add New Asset</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {isViewer ? (
          <div className="text-sm text-gray-600">
            You do not have permission to add assets.
          </div>
        ) : (
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
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
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

          {/* Service Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Date (Optional)</label>
            <input
              type="date"
              name="lastServiceDate"
              value={formData.lastServiceDate ?? ""}
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

          {(isAdminOrSupervisor || isDeptUser) && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="text-sm font-semibold text-gray-800">Reminder Settings (Optional)</div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!formData.reminderService?.enabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reminderService: {
                          enabled: e.target.checked,
                          startDays: prev.reminderService?.startDays ?? 7,
                          intervalDays: prev.reminderService?.intervalDays ?? 1,
                        },
                      }))
                    }
                  />
                  Service Reminder
                </label>
                {formData.reminderService?.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Days</label>
                      <select
                        value={formData.reminderService?.startDays ?? 7}
                        onChange={(e) => {
                          const startDays = Number(e.target.value);
                          const options = getIntervalOptions(startDays);
                          setFormData((prev) => ({
                            ...prev,
                            reminderService: {
                              enabled: true,
                              startDays,
                              intervalDays: options[0] ?? 1,
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value={7}>7 days</option>
                        <option value={15}>15 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Interval</label>
                      <select
                        value={formData.reminderService?.intervalDays ?? 1}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reminderService: {
                              enabled: true,
                              startDays: prev.reminderService?.startDays ?? 7,
                              intervalDays: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded"
                      >
                        {getIntervalOptions(formData.reminderService?.startDays ?? 7).map((v) => (
                          <option key={v} value={v}>
                            Every {v} day{v > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!formData.reminderContract?.enabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reminderContract: {
                          enabled: e.target.checked,
                          startDays: prev.reminderContract?.startDays ?? 7,
                          intervalDays: prev.reminderContract?.intervalDays ?? 1,
                        },
                      }))
                    }
                  />
                  Contract Reminder
                </label>
                {formData.reminderContract?.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Days</label>
                      <select
                        value={formData.reminderContract?.startDays ?? 7}
                        onChange={(e) => {
                          const startDays = Number(e.target.value);
                          const options = getIntervalOptions(startDays);
                          setFormData((prev) => ({
                            ...prev,
                            reminderContract: {
                              enabled: true,
                              startDays,
                              intervalDays: options[0] ?? 1,
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value={7}>7 days</option>
                        <option value={15}>15 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Interval</label>
                      <select
                        value={formData.reminderContract?.intervalDays ?? 1}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reminderContract: {
                              enabled: true,
                              startDays: prev.reminderContract?.startDays ?? 7,
                              intervalDays: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded"
                      >
                        {getIntervalOptions(formData.reminderContract?.startDays ?? 7).map((v) => (
                          <option key={v} value={v}>
                            Every {v} day{v > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Department */}
          {isAdminOrSupervisor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={(e) => {
                  const id = e.target.value;
                  const dept = DEPARTMENTS.find((d) => d.id === id);
                  setFormData((prev) => ({
                    ...prev,
                    departmentId: id,
                    departmentName: dept?.name || "",
                  }));
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDeptUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                {selectedDepartment
                  ? `${selectedDepartment.name} (${selectedDepartment.id})`
                  : formData.departmentId || "-"}
              </div>
            </div>
          )}

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
        )}
      </div>
    </div>
  );
};

export default AddAssetsPage;
