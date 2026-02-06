import express from "express";
import {
  createComplaint,
  getComplaintById,
  getComplaints,
  getActiveComplaintByAsset,
  supervisorResolveComplaint,
  closeComplaint,
  reopenComplaint,
} from "../controllers/complaintController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  requireRole(["ADMIN", "SUPERVISOR", "DEPARTMENT_USER"]),
  createComplaint
);
router.get("/", protect, getComplaints);
router.get("/active/byAsset/:assetId", protect, getActiveComplaintByAsset);
router.get("/:id", protect, getComplaintById);
router.patch(
  "/:id/supervisor-resolve",
  protect,
  requireRole(["ADMIN", "SUPERVISOR"]),
  supervisorResolveComplaint
);
router.patch(
  "/:id/close",
  protect,
  requireRole(["ADMIN", "SUPERVISOR", "DEPARTMENT_USER"]),
  closeComplaint
);
router.patch(
  "/:id/reopen",
  protect,
  requireRole(["ADMIN", "SUPERVISOR", "DEPARTMENT_USER"]),
  reopenComplaint
);

export default router;
