import express from 'express';
import { createComplaint, getComplaints } from '../controllers/complaintController.js';
import { protect, blockWriteIfViewer } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post('/', protect, blockWriteIfViewer(), createComplaint);
router.get('/', protect, getComplaints);

export default router;
