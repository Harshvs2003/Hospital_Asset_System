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
import { protect, blockWriteIfViewer } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, blockWriteIfViewer(), addAsset);
router.get("/", protect, getAllAssets);
router.get("/search", protect, searchAssets);
router.get("/byAssetId/:assetId", protect, getAssetByCustomId);
router.get("/:id", protect, getAssetById);
router.put("/:id", protect, blockWriteIfViewer(), updateAsset);
router.patch("/:id", protect, blockWriteIfViewer(), updateAsset);
router.delete("/:id", protect, blockWriteIfViewer(), deleteAsset);

export default router;
