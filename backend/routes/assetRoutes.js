import express from "express";
import {
  addAsset,
  getAllAssets,
  searchAssets,
  getAssetByCustomId,
  getAssetById,
  updateAsset,
  deleteAsset,
} from "../controllers/assetController.js";

const router = express.Router();

router.post("/", addAsset);
router.get("/", getAllAssets);
router.get("/search", searchAssets);
router.get("/byAssetId/:assetId", getAssetByCustomId);
router.get("/:id", getAssetById);
router.put("/:id", updateAsset);
router.patch("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;
