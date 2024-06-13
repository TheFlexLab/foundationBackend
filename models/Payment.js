const mongoose = require("mongoose");

// Define the schema for objects within the post array
const ProviderSchema = mongoose.Schema({
  ledgerCode: { type: String, required: true, },
  providerName: { type: String, required: true, },
  dollarSpent: { type: Number, required: true, },
  fdxPurchased: { type: Number, required: true, },
  description: { type: String, default: null, },
  details: { type: Object, required: true, },
  createdAt: { type: String, default: () => new Date().toISOString(), },
  updatedAt: { type: String, default: () => new Date().toISOString(), },
  deletedAt: { type: String, default: null, },
  isActive: { type: Boolean, default: true, },
})

const PaymentSchema = mongoose.Schema(
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
  PaymentSchema: mongoose.model("Payment", PaymentSchema),
};