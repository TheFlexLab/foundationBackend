const mongoose = require('mongoose');

// Define Analyze Models
const HiddenOptions = mongoose.Schema(
    {
        userUuid: {
            type: String,
            required: true,
        },
        questForeignKey: {
            type: String,
            required: true,
        },
        hiddenOptionsArray: {
            type: [String],
            required: true,
        },
        deletedAt: { type: String, default: null, },
        isActive: { type: Boolean, default: true, },
    },
    { timestamps: true },
);

const BadgeCount = mongoose.Schema(
    {
        userUuid: {
            type: String,
            required: true,
        },
        questForeignKey: {
            type: String,
            required: true,
        },
        oprend: {
            type: Number,
            required: true,
        },
        range: {
            type: Number,
            required: true,
        },
        deletedAt: { type: String, default: null, },
        isActive: { type: Boolean, default: true, },
    },
    { timestamps: true },
);

const Target = mongoose.Schema(
    {
        userUuid: {
            type: String,
            required: true,
        },
        questForeignKey: {
            type: String,
            required: true,
        },
        targetedQuestForeignKey: {
            type: String,
            required: true,
        },
        targetedOptionsArray: {
            type: [String],
            required: true,
        },
        deletedAt: { type: String, default: null, },
        isActive: { type: Boolean, default: true, },
    },
    { timestamps: true },
);

// Analyze Models
module.exports = {
    HiddenOptions: mongoose.model('HiddenOptions', HiddenOptions),
    BadgeCount: mongoose.model('BadgeCount', BadgeCount),
    Target: mongoose.model('Target', Target),
}
