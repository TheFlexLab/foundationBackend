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

// Analyze Models
module.exports = {
    HiddenOptions: mongoose.model('HiddenOptions', HiddenOptions)
}
