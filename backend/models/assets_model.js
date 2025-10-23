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
    quantity: {
        type: Number,
        required: true,
        default: 0
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
    status: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    }

},

{
    timestamps: true
}
);

const Asset = mongoose.model('Asset', AssetSchema);

export default Asset;
    