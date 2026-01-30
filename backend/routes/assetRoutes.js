import express from "express";
import {
  addAsset,
  getAllAssets,
  searchAssets,
  getAssetByCustomId,
  getAssetById,
  updateAsset,
  deleteAsset,
  markQrGenerated,
} from "../controllers/assetController.js";

const router = express.Router();

router.post("/", addAsset);

// 🔑 recent = not QR generated
router.get("/recent", async (req, res) => {
  try {
    const assets = await (await import("../models/assets_model.js")).default
      .find({ qrGenerated: false })
      .sort({ createdAt: -1 });

    res.status(200).json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", getAllAssets);
router.get("/search", searchAssets);
router.get("/byAssetId/:assetId", getAssetByCustomId);

// 🔑 QR GENERATED FLAG
router.patch("/:id/qr-generated", markQrGenerated);

router.get("/:id", getAssetById);
router.put("/:id", updateAsset);
router.patch("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;
