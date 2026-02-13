import Asset from "../models/assets_model.js";
import moment from "moment-timezone";
import {
  getDepartmentNameById,
  isValidDepartmentId,
} from "../config/departments.js";
import { fetchDeptUsers, fetchUsersByRole, notifyUsers } from "../utils/notificationService.js";
import { getCache, setCache, invalidateCacheByPrefix } from "../utils/queryCache.js";

// Helper for date formatting
const formatIST = (date) =>
  date ? moment(date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;

// Helper to generate 3-letter code from any string
const getThreeLetterCode = (str) => {
  if (!str) return "XXX";
  const cleaned = str.trim().toUpperCase();
  // Try to get meaningful abbreviation by taking first letter and consonants
  let code = cleaned.charAt(0);
  for (let i = 1; i < cleaned.length && code.length < 3; i++) {
    const char = cleaned.charAt(i);
    // Skip vowels (except if we need them for length)
    if (!'AEIOU'.includes(char)) {
      code += char;
    }
  }
  // Pad with first letters if needed
  while (code.length < 3) {
    code += cleaned.charAt(code.length % cleaned.length);
  }
  return code.slice(0, 3);
};

const getDeptFilter = (req) => {
  if (req.user?.role === "DEPARTMENT_USER") {
    return { departmentId: req.user.departmentId };
  }
  return {};
};

const ensureDeptAccess = (req, asset) => {
  if (req.user?.role === "DEPARTMENT_USER") {
    return asset.departmentId === req.user.departmentId;
  }
  return true;
};

const toAssetDto = (asset) => ({
  ...asset.toObject(),
  storeindate: formatIST(asset.storeindate),
  installdate: formatIST(asset.installdate),
  purchaseDate: formatIST(asset.purchaseDate),
  lastServiceDate: formatIST(asset.lastServiceDate),
  contractExpiryDate: formatIST(asset.contractExpiryDate),
  createdAt: formatIST(asset.createdAt),
  updatedAt: formatIST(asset.updatedAt),
  departmentId: asset.departmentId,
  departmentName: asset.departmentName,
});

// POST: Add Asset
export const addAsset = async (req, res) => {
  try {
    const { subcategory, departmentId: bodyDeptId, departmentName } = req.body;
    let departmentId = bodyDeptId;

    if (req.user?.role === "DEPARTMENT_USER") {
      departmentId = req.user.departmentId;
    }

    if (departmentName && !departmentId) {
      return res.status(400).json({
        message: "departmentId is required when departmentName is provided",
      });
    }

    if (departmentId && !isValidDepartmentId(departmentId)) {
      return res.status(400).json({ message: "Invalid departmentId" });
    }

    const resolvedDepartmentName = departmentId
      ? getDepartmentNameById(departmentId)
      : null;

    req.body.departmentId = departmentId || null;
    req.body.departmentName = resolvedDepartmentName;

    // Get 3-letter codes from department name and equipment/subcategory
    const deptCode = getThreeLetterCode(resolvedDepartmentName || "GEN");
    const equipCode = getThreeLetterCode(subcategory || "OTH");

    // Find the last asset with same department and equipment to increment number
    const last = await Asset.findOne({
      departmentName: resolvedDepartmentName,
      subcategory,
      ...getDeptFilter(req),
    })
      .sort({ createdAt: -1 })
      .lean();
    
    let nextNumber = 1;

    if (last?.assetId) {
      // Extract the last 4 digits from assetId (NHSS + DEPTCODE + EQUIPCODE + NUMBER)
      const lastNum = parseInt(last.assetId.slice(-4), 10);
      if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    // New format: NHSS + DEPTCODE (3) + EQUIPCODE (3) + NUMBER (4 digits, zero-padded)
    const newAssetId = `NHSS${deptCode}${equipCode}${String(nextNumber).padStart(
      4,
      "0"
    )}`;

    const newAsset = new Asset({
      ...req.body,
      assetId: newAssetId,
      history: [
        {
          type: "ASSET_EVENT",
          action: "Asset Created",
          message: `Asset created${req.body?.name ? `: ${req.body.name}` : ""}`,
          performedBy: req.user
            ? { id: req.user._id, name: req.user.name, role: req.user.role }
            : null,
          performedAt: new Date(),
        },
      ],
    });

    await newAsset.save();

    try {
      const deptUsers = await fetchDeptUsers(departmentId);
      const managers = await fetchUsersByRole(["SUPERVISOR", "ADMIN"]);
      await notifyUsers({
        users: [...deptUsers, ...managers],
        title: "New asset added",
        body: `${newAsset.name || "Asset"} (${newAsset.assetId}) added to ${resolvedDepartmentName || "department"}.`,
        type: "ASSET_CREATED",
        data: {
          assetId: newAsset.assetId,
          departmentId: newAsset.departmentId,
          url: `/assets/${newAsset.assetId}`,
        },
        departmentId: newAsset.departmentId,
      });
    } catch (notifyErr) {
      console.error("Asset notify error:", notifyErr);
    }

    const response = {
      ...toAssetDto(newAsset),
    };

    invalidateCacheByPrefix("assets:list:");
    res.status(201).json(response);
  } catch (error) {
    console.error("Error saving asset:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET: All Assets
export const getAllAssets = async (req, res) => {
  try {
    const hasPagination =
      req.query.paginated === "true" ||
      req.query.page !== undefined ||
      req.query.limit !== undefined;

    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const status = String(req.query.status || "").trim();
    const fromDate = String(req.query.fromDate || "").trim();
    const toDate = String(req.query.toDate || "").trim();
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20));

    const deptFilter = getDeptFilter(req);
    const filters = { ...deptFilter };
    if (q) {
      filters.$or = [
        { name: { $regex: q, $options: "i" } },
        { assetId: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { subcategory: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
      ];
    }
    if (category && category !== "All") filters.category = category;
    if (status && status !== "All") filters.status = status;
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setDate(to.getDate() + 1);
        filters.createdAt.$lt = to;
      }
    }

    if (!hasPagination) {
      const assets = await Asset.find(filters).sort({ createdAt: -1 });
      const assetsWithIST = assets.map((asset) => toAssetDto(asset));
      return res.status(200).json(assetsWithIST);
    }

    const cacheKey = `assets:list:${JSON.stringify({
      role: req.user?.role || "",
      departmentId: req.user?.departmentId || "",
      q,
      category,
      status,
      fromDate,
      toDate,
      page,
      limit,
    })}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, cached: true });
    }

    const total = await Asset.countDocuments(filters);
    const skip = (page - 1) * limit;
    const [items, summaryAgg, byCategoryAgg, byLocationAgg, categories] = await Promise.all([
      Asset.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Asset.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            available: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "available",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            maintenance: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "maintenance",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            damaged: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "damaged|out of order",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            totalValue: { $sum: { $ifNull: ["$price", 0] } },
          },
        },
      ]),
      Asset.aggregate([
        { $match: filters },
        {
          $group: {
            _id: { $ifNull: ["$category", "Uncategorized"] },
            total: { $sum: 1 },
            available: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "available",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            maintenance: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "maintenance",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            damaged: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "damaged|out of order",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { total: -1, _id: 1 } },
      ]),
      Asset.aggregate([
        { $match: filters },
        {
          $group: {
            _id: {
              $ifNull: [
                "$location",
                { $ifNull: ["$departmentName", "Unknown"] },
              ],
            },
            total: { $sum: 1 },
            available: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "available",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            maintenance: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "maintenance",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            damaged: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $toLower: { $ifNull: ["$status", ""] } },
                      regex: "damaged|out of order",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { total: -1, _id: 1 } },
      ]),
      Asset.distinct("category", {
        ...deptFilter,
        category: { $exists: true, $ne: null, $nin: [""] },
      }),
    ]);

    const summary = summaryAgg[0] || {
      total: 0,
      available: 0,
      maintenance: 0,
      damaged: 0,
      totalValue: 0,
    };

    const payload = {
      items: items.map((asset) => toAssetDto(asset)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        total: summary.total || 0,
        available: summary.available || 0,
        maintenance: summary.maintenance || 0,
        damaged: summary.damaged || 0,
        totalValue: summary.totalValue || 0,
      },
      byCategory: byCategoryAgg.map((row) => ({
        category: row._id || "Uncategorized",
        total: row.total || 0,
        available: row.available || 0,
        maintenance: row.maintenance || 0,
        damaged: row.damaged || 0,
      })),
      byLocation: byLocationAgg.map((row) => ({
        location: row._id || "Unknown",
        total: row.total || 0,
        available: row.available || 0,
        maintenance: row.maintenance || 0,
        damaged: row.damaged || 0,
      })),
      categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };

    setCache(cacheKey, payload, Number(process.env.ASSETS_LIST_CACHE_TTL_MS || 30_000), 300);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET: Search Assets
export const searchAssets = async (req, res) => {
  try {
    const { query } = req.query;
    const assets = await Asset.find({
      ...getDeptFilter(req),
      $or: [
        { name: { $regex: query, $options: "i" } },
        { assetId: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { subcategory: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
      ],
    });
    res.status(200).json(assets);
  } catch (error) {
    console.error("Error searching assets:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET: Asset by custom ID
export const getAssetByCustomId = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      assetId: req.params.assetId,
      ...getDeptFilter(req),
    });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const response = {
      ...asset.toObject(),
      storeindate: formatIST(asset.storeindate),
      installdate: formatIST(asset.installdate),
      purchaseDate: formatIST(asset.purchaseDate),
      lastServiceDate: formatIST(asset.lastServiceDate),
      contractExpiryDate: formatIST(asset.contractExpiryDate),
      createdAt: formatIST(asset.createdAt),
      updatedAt: formatIST(asset.updatedAt),
      departmentId: asset.departmentId,
      departmentName: asset.departmentName,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET: Asset by MongoDB _id
export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    if (!ensureDeptAccess(req, asset)) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const response = {
      ...asset.toObject(),
      storeindate: formatIST(asset.storeindate),
      installdate: formatIST(asset.installdate),
      purchaseDate: formatIST(asset.purchaseDate),
      lastServiceDate: formatIST(asset.lastServiceDate),
      contractExpiryDate: formatIST(asset.contractExpiryDate),
      createdAt: formatIST(asset.createdAt),
      updatedAt: formatIST(asset.updatedAt),
      departmentId: asset.departmentId,
      departmentName: asset.departmentName,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ message: error.message });
  }
};

// PUT & PATCH: Update Asset
export const updateAsset = async (req, res) => {
  try {
    const { departmentId: bodyDeptId, departmentName } = req.body;
    let departmentId = bodyDeptId;

    if (req.user?.role === "DEPARTMENT_USER") {
      departmentId = req.user.departmentId;
    }

    if (departmentName && !departmentId) {
      return res.status(400).json({
        message: "departmentId is required when departmentName is provided",
      });
    }

    if (departmentId && !isValidDepartmentId(departmentId)) {
      return res.status(400).json({ message: "Invalid departmentId" });
    }

    if (departmentId) {
      req.body.departmentId = departmentId;
      req.body.departmentName = getDepartmentNameById(departmentId);
    }

    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedAsset)
      return res.status(404).json({ message: "Asset not found" });
    if (!ensureDeptAccess(req, updatedAsset)) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.status(200).json(updatedAsset);
    invalidateCacheByPrefix("assets:list:");
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE: Asset
export const deleteAsset = async (req, res) => {
  try {
    const deletedAsset = await Asset.findByIdAndDelete(req.params.id);
    if (!deletedAsset)
      return res.status(404).json({ message: "Asset not found" });
    if (!ensureDeptAccess(req, deletedAsset)) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.status(200).json({
      message: `${deletedAsset.name} (${deletedAsset.assetId}) deleted successfully`,
    });
    invalidateCacheByPrefix("assets:list:");
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ message: error.message });
  }
};
