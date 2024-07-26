const mongoose = require("mongoose");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");

const columnsSchema = {
  id: String,
  list: Array,
};

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      max: 50,
      // required: true,
    },
    // username: {
    //   type: String,
    //   unique: true,
    //   min: 3,
    //   max: 20,
    //   required: true,
    // },
    password: {
      type: String,
      min: 6,
      // required: true,
    },
    isGuestMode: {
      type: Boolean,
      // default: false
    },
    gmailVerified: {
      type: Boolean,
      default: false,
    },
    verification: {
      type: Boolean,
      default: false,
    },
    referral: {
      type: Boolean,
      default: false,
    },
    metamaskVerified: {
      type: Boolean,
      default: false,
    },
    uuid: {
      type: String,
    },
    States: {
      expandedView: {
        type: Boolean,
        default: true,
      },
      searchData: {
        type: String,
        default: "",
      },
      filterByStatus: {
        type: String,
        default: "All",
      },
      filterByType: {
        type: String,
        default: "All",
      },
      filterByScope: {
        type: String,
        default: "All",
      },
      filterByMedia: {
        type: String,
        default: "All",
      },
      bookmarks: {
        type: Boolean,
        default: false,
      },
      filterBySort: {
        type: String,
        default: "Newest First",
      },
      topics: {
        All: columnsSchema,
        // Preferences: columnsSchema,
        Block: columnsSchema,
      },
      lightMode: {
        type: Boolean,
        default: true,
      },
      moderationRatingFilter: {
        type: Object,
        default: { initial: 0, final: 0 },
      },
      selectedBtnId: {
        type: String,
        default: "newButton",
      },
    },
    bookmarkStates: {
      expandedView: {
        type: Boolean,
        default: true,
      },
      searchData: {
        type: String,
        default: "",
      },
      filterByStatus: {
        type: String,
        default: "",
      },
      filterByType: {
        type: String,
        default: "",
      },
      filterByScope: {
        type: String,
        default: "",
      },
      filterBySort: {
        type: String,
        default: "Newest First",
      },
      columns: {
        All: columnsSchema,
        Block: columnsSchema,
      },
      lightMode: {
        type: Boolean,
        default: true,
      },
      moderationRatingFilter: {
        type: Object,
        default: { initial: 0, final: 0 },
      },
    },

    violationCounter: {
      type: Number,
      default: 0,
    },
    yourHiddenPostCounter: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0.0,
    },
    fdxEarned: {
      type: Number,
      default: 0.0,
    },
    fdxSpent: {
      type: Number,
      default: 0.0,
    },
    redemptionStatistics: {
      myTotalRedemptionCodeCreationCount: {
        type: Number,
        default: 0,
      },
      createCodeFdxSpent: {
        type: Number,
        default: 0.0,
      },
      codeRedeemedFdxEarned: {
        type: Number,
        default: 0.0,
      },
    },
    feeSchedual: {
      creatingPostFdx: {
        type: Number,
        default: 0.0,
      },
      creatingPostLinkFdx: {
        type: Number,
        default: 0.0,
      },
      creatingPostCustomLinkFdx: {
        type: Number,
        default: 0.0,
      },
      creatingListFdx: {
        type: Number,
        default: 0.0,
      },
      creatingListLinkFdx: {
        type: Number,
        default: 0.0,
      },
      creatingListCustomLinkFdx: {
        type: Number,
        default: 0.0,
      },
    },
    rewardSchedual: {
      postParticipationFdx: {
        type: Number,
        default: 0.0,
      },
      myEngagementInPostFdx: {
        type: Number,
        default: 0.0,
      },
      addingBadgeFdx: {
        type: Number,
        default: 0.0,
      },
    },
    walletAddr: {
      type: String,
    },
    signedUuid: {
      type: String,
    },
    requiredAction: {
      type: Boolean,
      default: false,
    },
    contentionsOnAddedAns: {
      type: Number,
      default: 0,
    },
    selectionsOnAddedAns: {
      type: Number,
      default: 0,
    },
    questsCreated: {
      type: Number,
      default: 0,
    },
    contentionsGiven: {
      type: Number,
      default: 0,
    },
    usersAnswered: {
      // Post Engaged
      type: Number,
      default: 0,
    },
    yourPostEngaged: {
      // Your Post Engaged
      type: Number,
      default: 0,
    },
    addedAnswers: {
      type: Number,
      default: 0,
    },
    changedAnswers: {
      type: Number,
      default: 0,
    },
    correctedAnswers: {
      type: Number,
      default: 0,
    },
    wrongedAnswers: {
      type: Number,
      default: 0,
    },
    createdQuests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: InfoQuestQuestions,
      },
    ],
    completedQuests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: InfoQuestQuestions,
      },
    ],
    badges: [
      {
        accountId: { type: String },
        accountName: { type: String },
        details: { type: Object },
        email: { type: String },
        isVerified: { type: Boolean },
        type: { type: String },
        primary: { type: Boolean },
        createdAt: { type: Date, default: new Date() },
        personal: { type: Object },
        legacy: { type: Object },
        web3: { type: Object },
        data: { type: Object },
      },
    ],
    badgeRemoved: [
      {
        badgeName: { type: String },
        type: { type: String },
        deletedAt: { type: Date },
      },
    ],
    role: {
      type: String,
      enum: ["guest", "user"],
      default: "guest",
    },
    userSettings: {
      darkMode: {
        type: Boolean,
        default: false,
      },
      defaultSort: {
        type: Boolean,
        default: true,
      },
    },
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      systemNotifications: {
        type: Boolean,
        default: true,
      },
    },
    isPasswordEncryption: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create a partial index to enforce uniqueness only on non-null emails
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

module.exports = mongoose.model("user", userSchema);
