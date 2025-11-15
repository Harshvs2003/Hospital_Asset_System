import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema({
  assetId: { type: String, required: false, index: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Filed', 'In Progress', 'Resolved'], default: 'Filed' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, required: false },
  meta: { type: mongoose.Schema.Types.Mixed, required: false },
});

const Complaint = mongoose.model('Complaint', ComplaintSchema);

export default Complaint;
