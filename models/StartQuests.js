const mongoose = require("mongoose");

const StartQuestsSchema = mongoose.Schema(
  {
    uuid: {
      type: String,
    },
    questForeignKey: {
      type: String,
    },
    addedAnswer: {
      type: String,
    },
    // correctAnswer: {
    //   type: String,
    // },
    data: {
      type: Array,
    },
    btnStatus: {
      type: String,
    },
    isFeedback: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StartQuests", StartQuestsSchema);
