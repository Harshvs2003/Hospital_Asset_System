import Asset from "../models/assets_model.js";
import moment from "moment-timezone";

/* ---------------- helpers ---------------- */

const formatIST = (date) =>
  date ? moment(date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;

// Helper to generate 3-letter code
const getThreeLetterCode = (str) => {
  if (!str) return "XXX";
  const cleaned = str.trim().toUpperCase();
  let code = cleaned.charAt(0);
  for (let i = 1; i < cleaned.length && code.length < 3; i++) {
    const ch = cleaned.charAt(i);
    if (!"AEIOU".includes(ch)) code += ch;
  }
  while (code.length < 3) {
    code += cleaned.charAt(code.length % cleaned.length);
  }
  return code.slice(0, 3);
};

/* ---------------- CREATE ---------------- */

export const addAsset = async (req, res) => {
  try {
    const { subcategory, departmentName } = req.body;

    const deptCode = getThreeLetterCode(departmentName || "GEN");
    const equipCode = getThreeLetterCode(subcategory || "OTH");

    const last = await Asset.findOne({ departmentName, subcategory })
      .sort({ createdAt: -1 })
      .lean();

    let nextNumber = 1;
    if (last?.assetId) {
      const lastNum = parseInt(last.assetId.slice(-4), 10);
      if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const assetId = `NHSS${deptCode}${equipCode}${String(nextNumber).padStart(
      4,
      "0",
    )}`;

    const asset = new Asset({
      ...req.body,
      assetId,
      qrGenerated: false, // 🔑 IMPORTANT
    });

    await asset.save();

    res.status(201).json(asset);
  } catch (error) {
    console.error("Error saving asset:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- READ ---------------- */

export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find({});
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔑 RECENT ASSETS (NOT QR GENERATED)
export const getRecentAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ qrGenerated: false })
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchAssets = async (req, res) => {
  try {
    const { query } = req.query;
    const assets = await Asset.find({
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
    res.status(500).json({ message: error.message });
  }
};

export const getAssetByCustomId = async (req, res) => {
  try {
    const asset = await Asset.findOne({ assetId: req.params.assetId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- UPDATE ---------------- */

// NORMAL UPDATE (assetId protected)
export const updateAsset = async (req, res) => {
  try {
    delete req.body.assetId; // 🔒 NEVER allow assetId update

    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!asset) return res.status(404).json({ message: "Asset not found" });

    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔑 MARK QR GENERATED (THIS FIXES YOUR ISSUE)
// MARK QR AS GENERATED (PRINTED)
export const markQrGenerated = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { qrGenerated: true },
      { new: true },
    );

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking QR generated:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- DELETE ---------------- */

export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    res.status(200).json({
      message: `${asset.name} (${asset.assetId}) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
