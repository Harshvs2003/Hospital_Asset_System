import mongoose from 'mongoose';
import moment from 'moment-timezone';

const AssetSchema = new mongoose.Schema({
    assetId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "Please enter a name"]
    },
    subcategory: {
        type: String,
        required: false
    },
    storeindate: {
        type: Date,
        default: () => moment.tz('Asia/Kolkata').toDate()
    },
    category: {
        type: String,
        required: true
    },
    installdate: {
        type: Date,
        required: false
    },
    purchaseDate: {
        type: Date,
        required: false
    },
    lastServiceDate: {
        type: Date,
        required: false
    },
    serviceDueDate: {
        type: Date,
        required: false
    },
    contractExpiryDate: {
        type: Date,
        required: false
    },
    serviceReminderStartDays: {
        type: Number,
        required: false,
        default: null
    },
    serviceReminderIntervalDays: {
        type: Number,
        required: false,
        default: null
    },
    serviceLastReminderSentAt: {
        type: Date,
        required: false,
        default: null
    },
    serviceNextReminderAt: {
        type: Date,
        required: false,
        default: null
    },
    contractReminderStartDays: {
        type: Number,
        required: false,
        default: null
    },
    contractReminderIntervalDays: {
        type: Number,
        required: false,
        default: null
    },
    contractLastReminderSentAt: {
        type: Date,
        required: false,
        default: null
    },
    contractNextReminderAt: {
        type: Date,
        required: false,
        default: null
    },
    reminderEmail: {
        type: String,
        required: false,
        default: null
    },
    supervisorEmail: {
        type: String,
        required: false,
        default: null
    },
    reminderService: {
        enabled: { type: Boolean, default: false },
        startDays: { type: Number, default: null },
        intervalDays: { type: Number, default: null }
    },
    reminderContract: {
        enabled: { type: Boolean, default: false },
        startDays: { type: Number, default: null },
        intervalDays: { type: Number, default: null }
    },
    reminderServiceLastSentAt: {
        type: Date,
        default: null
    },
    reminderContractLastSentAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    departmentId: {
        type: String,
        required: false
    },
    departmentName: {
        type: String,
        required: false
    },
    qrGenerated: {
        type: Boolean,
        default: false
    },
    history: [
        {
            type: { type: String, required: false },
            complaintId: { type: mongoose.Schema.Types.ObjectId, required: false },
            action: { type: String, required: true },
            message: { type: String, required: true },
            performedBy: { type: mongoose.Schema.Types.Mixed, required: false },
            performedAt: { type: Date, required: true }
        }
    ],

},

{
    timestamps: true
}
);

const Asset = mongoose.model('Asset', AssetSchema);

export default Asset;
    
