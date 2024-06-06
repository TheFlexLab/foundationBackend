const mongoose = require("mongoose");

// Define the schema for objects within the post array
const ProviderSchema = mongoose.Schema({
    providerName: { type: String, required: true, },
    accountId: { type: String, required: true, },
    isConnected: { type: Boolean, default: true, },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
})

const FinanceSchema = mongoose.Schema(
  {
    userUuid: { type: String, required: true, },
    providerDetails: {
        type: [ProviderSchema],
        default: [],
    },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
  }
);

// Export all schemas as properties of an object
module.exports = {
    ProviderSchema: mongoose.model("Provider", ProviderSchema),
    FinanceSchema: mongoose.model("Finance", FinanceSchema),
};