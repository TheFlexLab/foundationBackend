const mongoose = require("mongoose");
const { Schema } = mongoose;
// const shortLink = require("shortlink");

const UserQuestSetting = mongoose.Schema(
  {
    Question: { type: String },
    uuid: {
      // type: Schema.Types.ObjectId,
      // ref: "user",
      type: String,
      default: ""
    },
    questForeignKey: {
      // type: Schema.Types.ObjectId,
      // ref: "InfoQuestQuestions",
      type: String,
    },
    link: {
      type: String,
      default: "",
      // default: shortLink.generate(8)
    },
    linkCustomized: {
      type: Boolean,
      default: false
    },
    data: {
      type: Array,
    },
    image: {
      type: String,
      default: "",
    }, 
    linkStatus: {
      type: String,
      enum: ["Enable", "Disable", "Delete", ""],
      default: "",
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    hiddenMessage: {
      type: String,
      default: "",
    },
    questImpression: {
      type: Number,
      default: 0,
    },
    questsCompleted: {
      type: Number,
      default: 0,
    },
    hiddenTime: {
      type: Date, // Setting the field type to Date
      default: null, // Default value is null (no hidden time)
    },
    feedbackMessage: {
      type: String,
      default: "",
    },
    feedbackTime: {
      type: Date,
      default: null,
    },
    historyDate: {
      type: String,
      default: null,
    },
    result: {
      type: Array,
      // default: [{ answer: {}, contended: {} }],
      default: undefined,
    },
    hiddenTime: {
      type: Date,
      default: "",
    },
    sharedTime: {
      type: Date,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserQuestSetting", UserQuestSetting);
