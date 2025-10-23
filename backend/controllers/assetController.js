import Asset from "../models/assets_model.js";
import moment from "moment-timezone";

// Helper for date formatting
const formatIST = (date) =>
  date ? moment(date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;

// POST: Add Asset
export const addAsset = async (req, res) => {
  try {
    const { category, subcategory } = req.body;

    const categoryMap = {
      Furniture: "F",
      Beds: "B",
      Machines: "M",
      Electrical: "E",
    };
    const subcategoryMap = {
      Table: "TA",
      Chair: "CH",
      Light: "LT",
      "ICU Bed": "IC",
      ECG: "EC",
    };

    const catCode = categoryMap[category] || "X";
    const subCode =
      subcategoryMap[subcategory] ||
      (subcategory ? subcategory.slice(0, 2).toUpperCase() : "XX");

    const last = await Asset.findOne({ category, subcategory })
      .sort({ createdAt: -1 })
      .lean();
    let nextNumber = 1;

    if (last?.assetId) {
      const lastNum = parseInt(last.assetId.slice(-4), 10);
      if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const newAssetId = `NH${catCode}${subCode}${String(nextNumber).padStart(
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
      createdAt: formatIST(newAsset.createdAt),
      updatedAt: formatIST(newAsset.updatedAt),
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
    const assets = await Asset.find({});
    const assetsWithIST = assets.map((asset) => ({
      ...asset.toObject(),
      storeindate: formatIST(asset.storeindate),
      installdate: formatIST(asset.installdate),
      createdAt: formatIST(asset.createdAt),
      updatedAt: formatIST(asset.updatedAt),
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
    const asset = await Asset.findOne({ assetId: req.params.assetId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const response = {
      ...asset.toObject(),
      storeindate: formatIST(asset.storeindate),
      installdate: formatIST(asset.installdate),
      createdAt: formatIST(asset.createdAt),
      updatedAt: formatIST(asset.updatedAt),
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

    const response = {
      ...asset.toObject(),
      storeindate: formatIST(asset.storeindate),
      installdate: formatIST(asset.installdate),
      createdAt: formatIST(asset.createdAt),
      updatedAt: formatIST(asset.updatedAt),
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
    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedAsset)
      return res.status(404).json({ message: "Asset not found" });
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

    res.status(200).json({
      message: `${deletedAsset.name} (${deletedAsset.assetId}) deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ message: error.message });
  }
};
