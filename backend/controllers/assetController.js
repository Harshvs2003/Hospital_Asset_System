import Asset from "../models/assets_model.js";
import moment from "moment-timezone";
import {
  getDepartmentNameById,
  isValidDepartmentId,
} from "../config/departments.js";

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
    });

    await newAsset.save();

    const response = {
      ...newAsset.toObject(),
      storeindate: formatIST(newAsset.storeindate),
      installdate: formatIST(newAsset.installdate),
      purchaseDate: formatIST(newAsset.purchaseDate),
      lastServiceDate: formatIST(newAsset.lastServiceDate),
      contractExpiryDate: formatIST(newAsset.contractExpiryDate),
      createdAt: formatIST(newAsset.createdAt),
      updatedAt: formatIST(newAsset.updatedAt),
      departmentId: newAsset.departmentId,
      departmentName: newAsset.departmentName,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Error saving asset:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET: All Assets
export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find(getDeptFilter(req));
    const assetsWithIST = assets.map((asset) => ({
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
    }));
    res.status(200).json(assetsWithIST);
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
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ message: error.message });
  }
};
