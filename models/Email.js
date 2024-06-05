const mongoose = require('mongoose');

// Define Email Schema
const Email = new mongoose.Schema({
    userUuid: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
});

// Create Email Model
module.exports = mongoose.model('Email', Email);