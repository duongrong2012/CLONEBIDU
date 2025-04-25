const mongoose = require('mongoose');

const becomeSellerRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    rejectReason: {
        type: String,
        default: null
    },
    birthday: {
        type: Date,
        required: true
    },
    identityNumber: {
        type: String,
        required: true
    },
    bankName: {
        type: String,
        required: true
    },
    bankBranch: {
        type: String,
        required: true
    },
    taxCode: {
        type: String
    },
    national: {
        type: String,
        required: true
    },
    shop: {
        type: String,
        required: true
    },
    shopName: {
        type: String,
        required: true
    },
    isCompanyRegistered: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    ward: {
        type: String,
        required: true
    },
    currentDigitalPlatforms: [{
        type: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('BecomeSellerRequest', becomeSellerRequestSchema); 