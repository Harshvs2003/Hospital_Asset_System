import Complaint from '../models/complaint_model.js';

// POST /api/complaints
export const createComplaint = async (req, res) => {
  try {
    const { assetId, type, description } = req.body;
    if (!type || !description) return res.status(400).json({ message: 'type and description required' });

    const c = new Complaint({ assetId: assetId || null, type, description });
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    console.error('Error creating complaint', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/complaints?assetId=NH...
export const getComplaints = async (req, res) => {
  try {
    const { assetId } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    const list = await Complaint.find(filter).sort({ createdAt: 1 });
    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching complaints', err);
    res.status(500).json({ message: err.message });
  }
};
