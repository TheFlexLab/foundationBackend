const { QUEST_CREATED_AMOUNT } = require("../constants");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const UserModel = require("../models/UserModel");
const StartQuests = require("../models/StartQuests");
const User = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { getTreasury, updateTreasury } = require("../utils/treasuryService");
const { getUserBalance, updateUserBalance } = require("../utils/userServices");
const BookmarkQuests = require("../models/BookmarkQuests");
const {
  getPercentage,
  getPercentageQuestForeignKey,
} = require("../utils/getPercentage");
const shortLink = require("shortlink");
const { execSync } = require("child_process");
const UserQuestSetting = require("../models/UserQuestSetting");
const axios = require("axios");
const mongoose = require("mongoose");
const {
  UserListSchema,
  CategorySchema,
  PostSchema,
} = require("../models/UserList");
const Treasury = require("../models/Treasury");
const {
  notification1,
  notification2,
  notification3,
  notification4,
  notification5,
  notification6,
  notification7,
  notification8,
  notification9,
  notification10,
  notification11,
} = require("../notifications/home");

const createInfoQuestQuest = async (req, res) => {
  try {
    const userBalance = await getUserBalance(req.body.uuid);
    // if (userBalance < QUEST_CREATED_AMOUNT)
    //   throw new Error("The balance is insufficient to create a Quest!");
    // Find the user by uuid
    const user = await User.findOne({ uuid: req.body.uuid });

    if (!user) {
      return res.status(404).send("User not found");
    }
    const question = await new InfoQuestQuestions({
      Question: req.body.Question,
      QuestionCorrect: req.body.QuestionCorrect,
      whichTypeQuestion: req.body.whichTypeQuestion,
      usersAddTheirAns: req.body.usersAddTheirAns || false,
      usersChangeTheirAns: req.body.usersChangeTheirAns,
      QuestTopic: req.body.QuestTopic,
      userCanSelectMultiple: req.body.userCanSelectMultiple,
      QuestAnswers:
        req.body.QuestAnswers === undefined ? [] : req.body.QuestAnswers,
      QuestAnswersSelected:
        req.body.QuestAnswersSelected === undefined
          ? []
          : req.body.QuestAnswersSelected,
      uuid: req.body.uuid,
      getUserBadge: user._id,
      uniqueShareLink: shortLink.generate(8),
      moderationRatingCount: req.body.moderationRatingCount,
      url: req.body.url,
      description: req.body.description,
      isActive: true,
    });

    const createdQuestion = await question.save();
    if (!createdQuestion) {
      return res.status(404).send("Not Created 1");
    }

    // Increment the questsCreated field by one
    user.questsCreated += 1;

    // Push the ID of the created question into the createdQuests array
    user.createdQuests?.push(createdQuestion._id);
    // await User.findOneAndUpdate(
    //   { uuid: req.body.uuid },
    //   {
    //     $push: { createdQuests: createdQuestion._id },
    //   }
    // );

    // Save the updated user object
    await user.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postCreated",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: createdQuestion._id,
      // txDescription : "User creates a new quest"
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postCreated",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: user.uuid,
      txAmount: QUEST_CREATED_AMOUNT,
      txData: createdQuestion._id,
      // txDescription : "Incentive for creating a quest"
    });
    // Increment the Treasury
    await updateTreasury({ amount: QUEST_CREATED_AMOUNT, dec: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: QUEST_CREATED_AMOUNT,
      inc: true,
    });

    user.fdxEarned = user.fdxEarned + QUEST_CREATED_AMOUNT;
    user.feeSchedual.creatingPostFdx =
      user.feeSchedual.creatingPostFdx + QUEST_CREATED_AMOUNT;
    await user.save();

    res.status(201).json({
      message: "Quest has been Created",
      questID: createdQuestion._id,
      moderationRatingCount: req.body.moderationRatingCount,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while createInfoQuestQuest: ${error.message}`,
    });
  }
};

const deleteInfoQuestQuest = async (req, res) => {
  try {
    // Treasury Check
    // const checkTreasury = await Treasury.findOne();
    // if (!checkTreasury)
    //   return res.status(404).json({ message: "Treasury is not found." });
    // if (
    //   Math.round(checkTreasury.amount) <= QUEST_CREATED_AMOUNT ||
    //   Math.round(checkTreasury.amount) <= 0
    // )
    //   return res.status(404).json({ message: "Treasury is not enough." });

    const userBalanceCheck = await User.findOne({
      uuid: req.params.userUuid,
    });
    if (userBalanceCheck.balance < QUEST_CREATED_AMOUNT)
      return res.status(404).json({ message: "Balance is not enough." });

    const infoQuest = await InfoQuestQuestions.findOne({
      _id: req.params.questId,
      uuid: req.params.userUuid,
    });

    if (!infoQuest) return res.status(404).send("Info Quest not found");

    if (infoQuest.interactingCounter >= 1)
      return res.status(403).json({
        message: "Quest is involved in Discussion, Quest can't be deleted.",
      }); // Not neccessry if we add the check at FE to remove the delete icon from those who have { usersAddTheirAns: true }

    await InfoQuestQuestions.deleteOne({
      _id: req.params.questId,
      uuid: req.params.userUuid,
    }).exec();

    // Delete and Save Info Quest
    // infoQuest.isActive = false;
    // await infoQuest.save();

    // Remove from hiddens and shared
    await UserQuestSetting.deleteMany({
      questForeignKey: req.params.questId,
    }).exec();

    // Remove Relative Bookmarks
    await BookmarkQuests.deleteMany({
      questForeignKey: req.params.questId,
    }).exec();

    // Remove Posts from Relative Lists
    const userLists = await UserListSchema.aggregate([
      { $unwind: "$list" },
      { $unwind: "$list.post" },
      {
        $match: {
          "list.post.questForeginKey": new mongoose.Types.ObjectId(
            req.params.questId
          ),
        },
      },
      { $group: { _id: "$_id", count: { $sum: 1 } } },
    ]);

    // Step 2: Remove the posts
    await UserListSchema.updateMany(
      {
        "list.post.questForeginKey": new mongoose.Types.ObjectId(
          req.params.questId
        ),
      },
      {
        $pull: {
          "list.$[].post": {
            questForeginKey: new mongoose.Types.ObjectId(req.params.questId),
          },
        },
      }
    );

    // Step 3: Decrement the postCounter
    for (const userList of userLists) {
      await UserListSchema.updateOne(
        { _id: userList._id },
        {
          $inc: {
            "list.$[].postCounter": -1,
          },
        }
      );
    }

    // Set Up User's Details
    const user = await User.findOne({ uuid: req.params.userUuid });

    // Decrement the questsCreated field by one
    user.questsCreated -= 1;
    await user.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postDeleted",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "DAO",
      txAmount: 0,
      txData: req.params.questId,
      txDate: Date.now(),
      txDescription: "User deleted a Post",
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postDeleted",
      txID: txID,
      txAuth: "DAO",
      txFrom: user.uuid,
      txTo: "DAO Treasury",
      txAmount: QUEST_CREATED_AMOUNT,
      txDate: Date.now(),
      txDescription: "User deleted a Post",
      txData: req.params.questId,
      // txDescription : "Incentive for creating a quest"
    });
    // Increment the Treasury
    await updateTreasury({ amount: QUEST_CREATED_AMOUNT, inc: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.params.userUuid,
      amount: QUEST_CREATED_AMOUNT,
      dec: true,
    });

    user.fdxSpent = user.fdxSpent + QUEST_CREATED_AMOUNT;
    await user.save();

    res
      .status(200)
      .json({ message: "Info quest question deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: `An error occurred: ${error.message}` });
  }
};

const constraintForUniqueQuestion = async (req, res) => {
  try {
    // Get the question from the query parameters and convert it to lowercase
    const queryQuestion = req.query.question?.toLowerCase();

    // Escape special characters in the input query to ensure a literal match
    const escapedQuery = queryQuestion.replace(
      /[-[\]{}()*+?.,\\^$|#\s]/g,
      "\\$&"
    );

    // Check for a matching question in a case-insensitive manner
    const matchingQuestion = await InfoQuestQuestions.findOne({
      Question: { $regex: new RegExp(`^${escapedQuery}$`, "i") },
      suppressed: { $ne: true },
    });

    if (matchingQuestion && matchingQuestion?.isActive) {
      // If a matching question is found, it's not unique
      return res.status(200).json({ isUnique: false });
    }

    // If no matching question is found, it's unique
    return res.status(200).json({ isUnique: true });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};
const getAllQuests = async (req, res) => {
  try {
    const Questions = await InfoQuestQuestions.find();
    const resultArray = Questions.map(getPercentage);
    res.status(200).json(resultArray);
  } catch (err) {
    res.status(500).send(err);
  }
};
const getAllQuestsWithOpenInfoQuestStatus = async (req, res) => {
  try {
    const { moderationRatingFilter } = req.body;
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      //  filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
          moderationRatingCount: {
            $gte: moderationRatingFilter?.initial,
            $lte: moderationRatingFilter?.final,
          },
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // moderation filter
      filterObj.moderationRatingCount = {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      };
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        // .sort({ createdAt: -1 })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : req.body.sort === "Most Popular"
            ? { interactingCounter: -1 }
            : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      let Result = [];
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      //console.log("startedQuestions", startedQuestions);
      //console.log("allQuestions", allQuestions.length);
      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
          }
        });
        if (startedOrNot === false) {
          Result.push(rcrd);
        }
      });
      const start = req.body.start;
      const end = req.body.end;
      //console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      //console.log("resultArray", resultArray.length);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));
      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    //console.log(err);
    res.status(500).send(err);
  }
};

const getAllQuestsWithAnsweredStatus = async (req, res) => {
  try {
    const { moderationRatingFilter } = req.body;
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
          moderationRatingCount: {
            $gte: moderationRatingFilter?.initial,
            $lte: moderationRatingFilter?.final,
          },
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // moderation filter
      filterObj.moderationRatingCount = {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      };
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      //console.log("🚀 ~ getAllQuestsWithAnsStatus ~ hiddenUserSettingIds:",hiddenUserSettingIds);
      //console.log("🚀 ~ getAllQuestsWithAnsStatus ~ filterObj:", filterObj);

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        // .sort({ createdAt: -1 })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : req.body.sort === "Most Popular"
            ? { interactingCounter: -1 }
            : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      //console.log("req.body.uuid", req.body.uuid);
      let Records = [];
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });

      //console.log("startedQuestions", startedQuestions);
      //console.log("allQuestions", allQuestions.length);

      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
          }
        });
        if (startedOrNot === true) {
          Records.push(rcrd);
        }
      });
      //console.log("Records", Records.length);
      let Result = [];
      await Records.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            rcrd.startQuestData = rec;
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              rcrd.startStatus = "change answer";
            } else {
              rcrd.startStatus = "completed";
            }
          }
        });

        Result.push(rcrd);
      });

      const start = req.body.start;
      const end = req.body.end;
      //console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));

      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
    //console.log(err);
  }
};

const getAllQuestsWithDefaultStatus = async (req, res) => {
  const {
    uuid,
    _page,
    _limit,
    filter,
    sort,
    type,
    Page,
    terms,
    blockedTerms,
    moderationRatingFilter,
  } = req.body;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;
  //console.log("blockedTerms", blockedTerms);
  if (filter === true) {
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      //console.log("My Post Else");
      filterObj.uuid = uuid;
    }
  }

  if (type) {
    filterObj.whichTypeQuestion = type;
  }
  if (terms && terms.length > 0) {
    const regexTerm = terms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: regexTerm };
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: blockedTerms };

    // const hiddenQuestList = await InfoQuestQuestions.find({
    //   QuestTopic: { $in: blockedTerms },
    // });

    // const mapPromises = hiddenQuestList.map(async (item) => {
    //   const userQuestSettingExist = await UserQuestSetting.findOne({
    //     uuid: uuid,
    //     questForeignKey: item._id,
    //   });

    //   if (userQuestSettingExist) {
    //     // If userQuestSetting exists, update it
    //     await UserQuestSetting.findOneAndUpdate(
    //       { uuid: uuid, questForeignKey: item._id },
    //       { hidden: true }
    //     );
    //   } else {
    //     // If userQuestSetting does not exist, create it
    //     await UserQuestSetting.create({
    //       uuid: uuid,
    //       questForeignKey: item._id,
    //       hidden: true,
    //     });
    //   }
    // });

    // // Use Promise.allSettled to handle errors without stopping execution
    // await Promise.allSettled(mapPromises);
  }
  //console.log("Outside Bookmark");
  if (Page === "Bookmark") {
    //console.log("Inside Bookmark");
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    })
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    //console.log("Questions Length", Questions.length);
    //console.log("Bookmark filterObj", filterObj);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).populate("getUserBadge", "badges");
    });
    //console.log(mapPromises);

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    });

    //console.log("allQuestionsBookmark", allQuestions.length);
  } else if (Page === "Hidden") {
    //console.log("running");
    filterObj.uuid = uuid;
    filterObj.hidden = true;
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (req.body.Page === "SharedLink") {
    //console.log("running");
    filterObj.uuid = uuid;
    filterObj.linkStatus = { $in: ["Enable", "Disable"] };
    //console.log("filterObj", filterObj);
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .limit(pageSize)
      .skip(skip);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else {
    // moderation filter
    filterObj.moderationRatingCount = {
      $gte: moderationRatingFilter?.initial,
      $lte: moderationRatingFilter?.final,
    };
    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    //console.log("🚀 ~ getAllQuestsWithDefaultStatus ~ filterObj:", filterObj);
    allQuestions = await InfoQuestQuestions.find({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    })
      // .sort({ createdAt: -1 })
      .sort(
        sort === "Newest First"
          ? { createdAt: -1 }
          : sort === "Last Updated"
          ? { lastInteractedAt: -1 }
          : sort === "Most Popular"
          ? { interactingCounter: -1 }
          : "createdAt"
      )
      .skip(skip)
      .limit(pageSize)
      .populate("getUserBadge", "badges");
    totalQuestionsCount = await InfoQuestQuestions.countDocuments({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    });
  }

  //console.log("allQuestionsData", allQuestions.length);

  const resultArray = allQuestions.map((item) => getPercentage(item));
  const desiredArray = resultArray.map((item) => ({
    ...item._doc,
    selectedPercentage: item?.selectedPercentage?.[0]
      ? [
          Object.fromEntries(
            Object.entries(item.selectedPercentage[0]).sort(
              (a, b) => parseInt(b[1]) - parseInt(a[1])
            )
          ),
        ]
      : [],
    contendedPercentage: item?.contendedPercentage?.[0]
      ? [
          Object.fromEntries(
            Object.entries(item.contendedPercentage[0]).sort(
              (a, b) => parseInt(b[1]) - parseInt(a[1])
            )
          ),
        ]
      : [],
  }));
  // Query the database with skip and limit options to get questions for the requested page
  const result = await getQuestionsWithStatus(desiredArray, uuid);

  // getQuestionsWithUserSettings
  const result1 = await getQuestionsWithUserSettings(result, uuid);

  res.status(200).json({
    data: result1,
    hasNextPage: skip + pageSize < totalQuestionsCount,
  });
};
const suppressConditions = [
  { id: "Has Mistakes or Errors", minCount: 2 },
  { id: "Needs More Options", minCount: 2 },
  { id: "Unclear / Doesn’t make Sense", minCount: 2 },
  { id: "Duplicate / Similar Post", minCount: 2 },
  { id: "Not interested", minCount: Number.POSITIVE_INFINITY },
  { id: "Does not apply to me", minCount: Number.POSITIVE_INFINITY },
  { id: "Historical / Past Event", minCount: Number.POSITIVE_INFINITY },
];
const getQuestsAll = async (req, res) => {
  const {
    uuid,
    _page,
    _limit,
    filter,
    sort,
    type,
    Page,
    terms,
    blockedTerms,
    moderationRatingInitial,
    moderationRatingFinal,
    participated,
    start,
    end,
    media,
  } = req.query;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  //console.log("blockedTerms", blockedTerms);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;

  if (sort === "Most Popular") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log("date", sevenDaysAgo);
    filterObj.createdAt = { $gte: sevenDaysAgo };
  }

  if (filter === "true") {
    //console.log("filter");
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      //console.log("My Post Else");
      filterObj.uuid = uuid;
    }
  }

  if (type !== "All") {
    filterObj.whichTypeQuestion = type;
  }

  if (media !== "All") {
    if (media === "Video") {
      filterObj.$or = [
        { url: { $regex: "youtube.com", $options: "i" } },
        { url: { $regex: "youtu.be", $options: "i" } },
        { url: { $regex: "youtube-nocookie.com", $options: "i" } },
      ];
    }

    if (media === "Image") {
      filterObj.url = { $regex: "live.staticflickr.com", $options: "i" };
    }

    if (media === "Music") {
      filterObj.url = { $regex: "soundcloud.com", $options: "i" };
    }

    if (media === "Giphy") {
      filterObj.url = { $regex: "giphy.com", $options: "i" };
    }
  }

  if (terms) {
    // const regexTerm = terms.map((term) => new RegExp(term, "i"));
    // filterObj.QuestTopic = { $in: regexTerm };
    const regex = { $regex: terms, $options: "i" };

    filterObj.$or = [
      { Question: regex },
      { whichTypeQuestion: regex },
      { "QuestAnswers.question": regex },
      { QuestTopic: regex },
      { description: regex },
    ];

    // $or: [
    //   { Question: { $regex: terms, $options: "i" } },
    //   { whichTypeQuestion: { $regex: terms, $options: "i" } },
    //   { "QuestAnswers.question": { $regex: terms, $options: "i" } },
    //   { QuestTopic: { $regex: terms, $options: "i" } },
    //   { description: { $regex: terms, $options: "i" } },
    // ]

    // filterObj.Question = regex;
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    const blockedTermsArray = JSON.parse(blockedTerms);
    filterObj.QuestTopic = { $in: blockedTermsArray };
    // filterObj.QuestTopic = { $in: blockedTerms };

    // const hiddenQuestList = await InfoQuestQuestions.find({
    //   QuestTopic: { $in: blockedTerms },
    // });

    // const mapPromises = hiddenQuestList.map(async (item) => {
    //   const userQuestSettingExist = await UserQuestSetting.findOne({
    //     uuid: uuid,
    //     questForeignKey: item._id,
    //   });

    //   if (userQuestSettingExist) {
    //     // If userQuestSetting exists, update it
    //     await UserQuestSetting.findOneAndUpdate(
    //       { uuid: uuid, questForeignKey: item._id },
    //       { hidden: true }
    //     );
    //   } else {
    //     // If userQuestSetting does not exist, create it
    //     await UserQuestSetting.create({
    //       uuid: uuid,
    //       questForeignKey: item._id,
    //       hidden: true,
    //     });
    //   }
    // });

    // // Use Promise.allSettled to handle errors without stopping execution
    // await Promise.allSettled(mapPromises);
  }

  //console.log("Outside Bookmark");
  if (Page === "Bookmark") {
    //console.log("Inside Bookmark");
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingInitial,
        $lte: moderationRatingFinal,
      },
    })
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    //console.log("Questions Length", Questions.length);
    //console.log("Bookmark filterObj", filterObj);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,

        moderationRatingCount: {
          $gte: moderationRatingInitial,
          $lte: moderationRatingFinal,
        },
      }).populate("getUserBadge", "badges");
    });
    //console.log(mapPromises);

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingInitial,
        $lte: moderationRatingFinal,
      },
    });

    //console.log("allQuestionsBookmark", allQuestions.length);
  } else if (Page === "Hidden") {
    //console.log("running");
    filterObj.uuid = uuid;
    // filterObj.hidden = true;
    filterObj.feedbackMessage = { $ne: '', $exists: true };
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ feedbackTime: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    // Filter out suppressed questions if req.query.uuid does not match uuid
    // if (req.query.uuid) {
    //   allQuestions = allQuestions.filter((question) => {
    //     return !question.suppressed || question.uuid === req.query.uuid;
    //   });
    // } else {
    //   allQuestions = allQuestions.filter((question) => !question.suppressed);
    // }
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (Page === "SharedLink") {
    //console.log("running");
    filterObj.uuid = uuid;
    filterObj.linkStatus = { $in: ["Enable", "Disable"] };
    //console.log("filterObj", filterObj);
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .limit(pageSize)
      .skip(skip);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (Page === "Feedback") {
    const hiddenUserSettings = await UserQuestSetting.find({
      feedbackMessage: {$ne: ""},
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    allQuestions = await InfoQuestQuestions.find({
      _id: { $in: hiddenUserSettingIds },
      uuid: uuid,
      ...filterObj,
      isActive: true,
    })
      .populate("getUserBadge", "badges")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(skip);
    //console.log("all", allQuestions);
  } else {
    // moderation filter
    filterObj.moderationRatingCount = {
      $gte: moderationRatingInitial,
      $lte: moderationRatingFinal,
    };

    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );
    //console.log("🚀 ~ getQuestsAll ~ hiddenUserSettingIds:",hiddenUserSettingIds);
    //console.log("🚀 ~ getQuestsAll ~ filterObj:", filterObj);

    let query = InfoQuestQuestions.find({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
      isActive: true,
    });

    query = query.sort(
      sort === "Oldest First"
        ? { createdAt: 1, _id: 1 }
        : sort === "Newest First"
        ? { createdAt: -1, _id: 1 }
        : sort === "Last Updated"
        ? { lastInteractedAt: -1, _id: 1 }
        : sort === "Most Popular"
        ? { interactingCounter: -1, _id: 1 }
        : { createdAt: -1, _id: 1 }
    );
    // query = query.sort(
    //   sort === "Newest First"
    //     ? { createdAt: -1 }
    //     : sort === "Last Updated"
    //       ? { lastInteractedAt: -1 }
    //       : sort === "Most Popular"
    //         ? { interactingCounter: -1 }
    //         : { createdAt: -1 } // Default sort
    // );
    if (participated === "All") {
      query = query.skip(skip).limit(pageSize);
    }

    allQuestions = await query.populate("getUserBadge", "badges");

    // Filter out suppressed questions if req.query.uuid does not match uuid
    if (req.query.uuid) {
      allQuestions = allQuestions.filter((question) => {
        return !question.suppressed || question.uuid === req.query.uuid;
      });
    } else {
      allQuestions = allQuestions.filter((question) => !question.suppressed);
    }

    totalQuestionsCount = await InfoQuestQuestions.countDocuments({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    });
  }
  //console.log("allQuestionsData", allQuestions.length);

  let resultArray;
  let nextPage;

  if (participated === "Yes") {
    //console.log("Inside resultArray if participated");
    let Records = [];
    const startedQuestions = await StartQuests.find({
      uuid,
      // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
    });

    //console.log("startedQuestions", startedQuestions);
    //console.log("allQuestions", allQuestions.length);

    await allQuestions.map(async function (rcrd) {
      let startedOrNot = false;
      await startedQuestions.map(function (rec) {
        if (rec.questForeignKey === rcrd._id.toString()) {
          startedOrNot = true;
        }
      });
      if (startedOrNot === true) {
        Records.push(rcrd);
      }
    });
    //console.log("Records", Records.length);
    let Result = [];
    await Records.map(async function (rcrd) {
      await startedQuestions.map(function (rec) {
        if (rec.questForeignKey === rcrd._id.toString()) {
          rcrd.startQuestData = rec;
          if (
            rcrd.usersChangeTheirAns?.trim() !== "" ||
            rcrd.whichTypeQuestion === "ranked choise"
          ) {
            rcrd.startStatus = "change answer";
          } else {
            rcrd.startStatus = "completed";
          }
        }
      });

      Result.push(rcrd);
    });

    // const start = req.body.start;
    // const end = req.body.end;
    //console.log("Start" + start + "end" + end);

    nextPage = end < Result.length;
    resultArray = Result.slice(start, end).map(getPercentage);
  } else if (participated === "Not") {
    //console.log("Inside resultArray participated Not");

    let Result = [];
    const startedQuestions = await StartQuests.find({
      uuid,
      // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
    });

    await allQuestions.map(async function (rcrd) {
      let startedOrNot = false;
      await startedQuestions.map(function (rec) {
        if (rec.questForeignKey === rcrd._id.toString()) {
          startedOrNot = true;
        }
      });
      if (startedOrNot === false) {
        Result.push(rcrd);
      }
    });
    // const start = req.body.start;
    // const end = req.body.end;
    //console.log("Start" + start + "end" + end);

    resultArray = Result.slice(start, end).map(getPercentage);
    nextPage = end < Result.length;
  } else {
    //console.log("Inside resultArray else");
    nextPage = skip + pageSize < totalQuestionsCount;
    resultArray = allQuestions.map((item) => getPercentage(item));
  }

  for (let i = 0; i < resultArray.length; i++) {
    const item = resultArray[i];
    const bookmarkDoc = await BookmarkQuests.findOne({
      questForeignKey: item._doc._id,
      uuid,
    });

    // //console.log('bookmarkDoc', bookmarkDoc)
    if (bookmarkDoc) {
      resultArray[i]._doc.bookmark = true;
    } else {
      resultArray[i]._doc.bookmark = false;
    }

    if (Page === "Feedback") {
      // Get the count of hidden items grouped by hidden message
      const suppression = await UserQuestSetting.aggregate([
        {
          $match: {
            feedbackMessage: {$ne: ""},
            questForeignKey: item._doc._id.toString(),
          },
        },
        {
          $group: {
            _id: "$hiddenMessage",
            count: { $sum: 1 },
          },
        },
      ]);

      let feedback = [];

      if (suppression) {
        // For each suppression item, check against suppressConditions
        suppression.forEach((suppressItem) => {
          suppressConditions.forEach((condition) => {
            if (suppressItem._id === condition.id) {
              const violated =
                suppressItem.count >= condition.minCount &&
                condition.id !== "Does not apply to me" &&
                condition.id !== "Not interested" &&
                condition.id !== "Needs More Options" &&
                condition.id !== "Historical / Past Event";
              feedback.push({
                id: suppressItem._id,
                count: suppressItem.count,
                violated: violated,
              });
            }
          });
        });
      }

      resultArray[i]._doc.feedback = feedback;
      resultArray[i]._doc.hiddenCount = await UserQuestSetting.countDocuments({
        hidden: true,
        questForeignKey: item._doc._id,
      });

      if(!resultArray[i]._doc.isAddOptionFeedback){
        if (resultArray[i]._doc.hiddenCount === 0) {
          if (resultArray[i]._doc.suppressedReason) {
            if (resultArray[i]._doc.suppressedReason === "") {
              resultArray.splice(i, 1);
              i--;
            }
          } else {
            resultArray.splice(i, 1);
            i--;
          }
        }
      }
    }
  }

  const desiredArray = resultArray.map((item) => ({
    ...item._doc,
    selectedPercentage: item?.selectedPercentage?.[0]
      ? [
          Object.fromEntries(
            Object.entries(item.selectedPercentage[0]).sort(
              (a, b) => parseInt(b[1]) - parseInt(a[1])
            )
          ),
        ]
      : [],
    contendedPercentage: item?.contendedPercentage?.[0]
      ? [
          Object.fromEntries(
            Object.entries(item.contendedPercentage[0]).sort(
              (a, b) => parseInt(b[1]) - parseInt(a[1])
            )
          ),
        ]
      : [],
  }));
  // Query the database with skip and limit options to get questions for the requested page
  const result = await getQuestionsWithStatus(desiredArray, uuid);

  // getQuestionsWithUserSettings
  const result1 = await getQuestionsWithUserSettings(result, uuid);

  const user = await UserModel.findOne({
    uuid: uuid,
  });

  if (result1.length !== 0) {
    if (!terms) {
      if (user?.notificationSettings?.systemNotifications) {
        // Check if it's not the "Hidden" or "SharedLink" page and if it's the first page
        if (Page !== "Hidden" && Page !== "SharedLink" && Page !== "Feedback") {
          const user = await UserModel.findOne({
            uuid: uuid,
          });
          if (!user) throw new Error(`No user found against ${uuid}`);
          let mode = user.isGuestMode;
          let notificationGuest1, notificationGuest2;

          if (mode && page === 1) {
            // Define Guest's notificationGuest1 properties
            notificationGuest1 = {
              id: "system_notification",
              icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
              header: "Ready to start growing your FDX balance?",
              text: [
                "The more FDX you have, the more opportunity you have in the future to monetize from it. Invest your time by engaging now, to cash out later!",
              ],
              buttonText: "Join Foundation",
              buttonUrl: "/guest-signup",
              category: "Home",
              position: "Feed",
              priority: 1,
              mode: "Guest",
              timestamp: new Date().toISOString(),
            };
            // Define Guest's notificationGuest2 properties
            notificationGuest2 = {
              id: "system_notification",
              icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
              header: "What is Foundation?",
              text: [
                "You know you have personal data - it's all over the internet - but did you know you can sell it and monetize from it? Foundation is a platform where data gate-keeping is no more. It puts the ownership of your data back in your control.",
              ],
              buttonText: "Learn More",
              buttonUrl: "/help/about",
              category: "Home",
              position: "Feed",
              priority: 2,
              mode: "Guest",
              timestamp: new Date().toISOString(),
            };
            result1.splice(0, 0, notificationGuest1);
            result1.splice(2, 0, notificationGuest2);
          } else if (!mode) {
            // Page 1
            if (page === 1 && nextPage === false) {
              if (result1.length < 2) {
                result1.splice(0, 0, notification1);
              } else if (result1.length < 5) {
                result1.splice(0, 0, notification1);
                result1.splice(3, 0, notification2);
              } else {
                result1.splice(0, 0, notification1);
                result1.splice(3, 0, notification2);
                result1.splice(7, 0, notification3);
              }
            }
            if (page === 1 && nextPage === true) {
              result1.splice(0, 0, notification1);
              result1.splice(3, 0, notification2);
              result1.splice(7, 0, notification3);
            }

            // Page 2
            if (page === 2 && nextPage === false) {
              if (result1.length >= 3) {
                result1.splice(3, 0, notification4);
              }
            }
            if (page === 2 && nextPage === true) {
              result1.splice(3, 0, notification4);
            }

            // Page 3
            if (page === 3 && nextPage === false) {
              if (result1.length < 4) {
                result1.splice(1, 0, notification5);
              } else if (result1.length >= 4) {
                result1.splice(1, 0, notification5);
                result1.splice(5, 0, notification6);
              }
            }
            if (page === 3 && nextPage === true) {
              result1.splice(1, 0, notification5);
              result1.splice(5, 0, notification6);
            }

            // Page 4
            if (page === 4 && nextPage === false) {
              if (result1.length >= 2 && result1.length < 5) {
                result1.splice(2, 0, notification7);
              } else if (result1.length === 5) {
                result1.splice(2, 0, notification7);
                result1.splice(6, 0, notification8);
              }
            }
            if (page === 4 && nextPage === true) {
              result1.splice(2, 0, notification7);
              result1.splice(6, 0, notification8);
            }

            // Page 5
            if (page === 5 && nextPage === false) {
              if (result1.length >= 3) {
                result1.splice(3, 0, notification9);
              }
            }
            if (page === 5 && nextPage === true) {
              result1.splice(3, 0, notification9);
            }

            // Page 6
            if (page === 6 && nextPage === false) {
              if (result1.length >= 1 && result1.length < 4) {
                result1.splice(1, 0, notification10);
              } else if (result1.length >= 4) {
                result1.splice(1, 0, notification10);
                result1.splice(5, 0, notification11);
              }
            }
            if (page === 6 && nextPage === true) {
              result1.splice(1, 0, notification10);
              result1.splice(5, 0, notification11);
            }
          }
        }
      }
    }
  }

  return res.status(200).json({
    data: result1,
    hasNextPage: nextPage,
  });
};

const getAllQuestsWithResult = async (req, res) => {
  const { uuid, _page, _limit, filter, sort, type, Page, terms, blockedTerms } =
    req.body;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;

  if (filter === true) {
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      filterObj.uuid = uuid;
    }
  }

  if (type) {
    filterObj.whichTypeQuestion = type;
  }
  if (terms && terms.length > 0) {
    const regexTerm = terms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: regexTerm };
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: blockedTerms };
  }

  if (Page === "Bookmark") {
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
    }).sort({ createdAt: -1 });
    // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments(filterObj);
  } else if (Page === "Hidden") {
    //console.log("running");
    filterObj.uuid = uuid;
    filterObj.hidden = true;
    const Questions = await UserQuestSetting.find(filterObj).sort({
      createdAt: -1,
    });
    // .sort(
    //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
    // );

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (req.body.Page === "SharedLink") {
    //console.log("running");
    filterObj.uuid = uuid;
    filterObj.linkStatus = "Enable";
    const Questions = await UserQuestSetting.find(filterObj).sort({
      createdAt: -1,
    });
    // .sort(
    //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
    // );

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else {
    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    allQuestions = await InfoQuestQuestions.find({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    })
      .sort(
        sort === "Newest First"
          ? { createdAt: -1 }
          : sort === "Last Updated"
          ? { lastInteractedAt: -1 }
          : sort === "Most Popular"
          ? { interactingCounter: -1 }
          : "createdAt"
      ) // Sort by createdAt field in descending order
      .skip(skip)
      .limit(pageSize);
    totalQuestionsCount = await InfoQuestQuestions.countDocuments(filterObj);
  }

  const resultArray = allQuestions.map(getPercentage);

  // Query the database with skip and limit options to get questions for the requested page

  const result = await getQuestionsWithStatus(resultArray, uuid);
  // getQuestionsWithUserSettings
  const result1 = await getQuestionsWithUserSettings(result, uuid);

  res.status(200).json({
    data: result1,
    hasNextPage: skip + pageSize < totalQuestionsCount,
  });
};

const getQuestById = async (req, res) => {
  try {
    const { uuid, id, page } = req.params; // Use req.params instead of req.body
    const { postLink } = req.query;
    const infoQuest = await InfoQuestQuestions.find({
      _id: id,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Quest Exist!");

    const result = await getQuestionsWithStatus(infoQuest, uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    let quest;

    if (page === "SharedLink") {
      quest = await UserQuestSetting.findOne({ link: postLink });
    }
    //console.log("questSharedLink", quest);

    const resultArray = result1.map((item) => getPercentage(item, page, quest));

    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage
        ? item.selectedPercentage
        : [],
      contendedPercentage: item.contendedPercentage
        ? item.contendedPercentage
        : [],
      userQuestSetting: item.userQuestSetting,
    }));

    res.status(200).json({
      data: desiredArray,
    });
  } catch (error) {
    //console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestById InfoQuest: ${error.message}`,
    });
  }
};

async function getQuestByIdQuestForeignKey(questForeignKey) {
  try {
    const infoQuest = await InfoQuestQuestions.find({
      _id: new mongoose.Types.ObjectId(questForeignKey.toString()),
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Quest Exist!");

    const result = await getQuestionsWithStatusQuestForeignKey(
      infoQuest,
      questForeignKey
    );
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettingsQuestForeignKey(
      result,
      questForeignKey
    );

    let quest;

    // if (page === "SharedLink") {
    quest = await UserQuestSetting.findOne({
      questForeignKey: questForeignKey,
    });
    // }
    // //console.log("questSharedLink", quest);

    const resultArray = result1.map((item) =>
      getPercentageQuestForeignKey(item, quest)
    );

    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      userQuestSetting: item.userQuestSetting,
    }));

    return desiredArray[0];
  } catch (error) {
    //console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestById InfoQuest: ${error.message}`,
    });
  }
}

const getQuestByUniqueShareLink = async (req, res) => {
  try {
    // req.cookie
    //console.log("🚀 ~ getQuestById ~ req.cookie:", req.cookies);
    // return
    const uuid = req.query.uuid;
    const { uniqueShareLink } = req.params; // Use req.params instead of req.body

    const userQuestSetting = await UserQuestSetting.findOne({
      // uuid,
      link: uniqueShareLink,
      linkStatus: "Enable",
    });

    if (!userQuestSetting) {
      // If the document doesn't exist, you may want to handle this case
      return res
        .status(404)
        .json({ status: false, message: "This link is not active" });
    }

    const infoQuest = await InfoQuestQuestions.find({
      _id: userQuestSetting.questForeignKey,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Post Exist!");

    if (infoQuest.isActive === false) {
      return res.status(404).json({ message: "This link is not active." });
    }

    const result = await getQuestionsWithStatus(infoQuest, uuid);

    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    const userQuestSettingForTerminal = await UserQuestSetting.findOne({
      uuid: uuid,
      questForeignKey: userQuestSetting.questForeignKey,
      linkStatus: "Enable",
    });

    const resultArray = result1.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      userQuestSetting: userQuestSettingForTerminal,
    }));

    const user = await User.findOne({ uuid: uuid });
    if (user.role === "guest") {
      notification = {
        id: "guest_notification",
        icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
        header: "Someone wants your thoughts on this.",
        text: [
          "Welcome to Foundation - where you can post anonymously while building your data profile.",
          "The more data you add, the more FDX you earn, and the more opportunity you have to monetize it later.",
        ],
        buttonText: "Join Foundation",
        buttonUrl: "/guest-signup",
        category: "",
        position: "Full screen post",
        priority: 2,
        mode: "Guest",
        timestamp: new Date().toISOString(),
      };

      desiredArray.splice(1, 0, notification);
    }

    res.status(200).json({
      data: desiredArray,
    });
  } catch (error) {
    //console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestByUniqueShareLink InfoQuest: ${error.message}`,
    });
  }
};

const getQuestByUniqueId = async (req, res) => {
  try {
    const { postId, uuid } = req.params;

    const infoQuest = await InfoQuestQuestions.find({
      _id: postId,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Post Exist!");

    // if (infoQuest.isActive === false) {
    //   return res.status(404).json({ message: "This link is not active." });
    // }

    const result = await getQuestionsWithStatus(infoQuest, uuid);

    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    const resultArray = result1.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
    }));

    res.status(200).json({
      data: desiredArray,
    });
  } catch (error) {
    //console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestByUniqueShareLink InfoQuest: ${error.message}`,
    });
  }
};

const getAllQuestsWithCompletedStatus = async (req, res) => {
  try {
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : req.body.sort === "Most Popular"
            ? { interactingCounter: -1 }
            : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
            } else {
              rcrd.startStatus = "completed";
              Result.push(rcrd);
            }
          }
        });
      });

      const start = req.body.start;
      const end = req.body.end;
      //console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));
      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};
const suppressPost = async (req, res) => {
  try {
    const { id } = req.params;

    const supression = await InfoQuestQuestions.findOneAndUpdate(
      { _id: id },
      { suppressed: true, suppressedReason: "Invalid Media" }
    );

    if (supression) {
      return res.status(200).json({
        message: "Suppressed successfully",
        data: supression,
      });
    } else {
      return res.status(404).json({
        message: "Post not found",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: `An error occurred while suppressing: ${err.message}`,
    });
  }
};

const getAllQuestsWithChangeAnsStatus = async (req, res) => {
  try {
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $nin: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
      }).sort(
        req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort(
        sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort(
        sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : req.body.sort === "Most Popular"
            ? { interactingCounter: -1 }
            : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      let Result = [];

      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
            rcrd.startQuestData = rec;
          }
        });
        if (startedOrNot === true) {
          // if (rcrd.QuestionCorrect === "Not Selected") {
          if (
            rcrd.usersChangeTheirAns?.trim() !== "" ||
            rcrd.whichTypeQuestion === "ranked choise"
          ) {
            rcrd.startStatus = "change answer";
            Result.push(rcrd);
          }
        }
      });
      const start = req.body.start;
      const end = req.body.end;

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));

      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};

async function getQuestionsWithStatus(allQuestions, uuid) {
  try {
    if (uuid === "" || uuid === undefined) {
      return allQuestions;
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: uuid,
      });

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            if(rec.isFeedback){
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            }
            else if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              rcrd.startStatus = "change answer";
              rcrd.startQuestData = rec;
            } else {
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithUserSettings(allQuestions, uuid) {
  try {
    if (uuid === "" || uuid === undefined) {
      return allQuestions;
    } else {
      const userQuestSettings = await UserQuestSetting.find({
        uuid: uuid,
      });
      // //console.log(
      //   "🚀 ~ getQuestionsWithUserSettings ~ userQuestSettings:",
      //   userQuestSettings
      // );

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await userQuestSettings.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            rcrd.userQuestSetting = rec;
            // if (
            //   rcrd.usersChangeTheirAns?.trim() !== "" ||
            //   rcrd.whichTypeQuestion === "ranked choise"
            // ) {
            //   rcrd.startStatus = "change answer";
            //   rcrd.startQuestData = rec;
            // } else {
            //   rcrd.startStatus = "completed";
            //   rcrd.startQuestData = rec;
            // }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithStatusQuestForeignKey(
  allQuestions,
  questForeignKey
) {
  try {
    if (questForeignKey === "" || questForeignKey === undefined) {
      return allQuestions;
    } else {
      const startedQuestions = await StartQuests.find({
        questForeignKey: questForeignKey,
      });

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              rcrd.startStatus = "change answer";
              rcrd.startQuestData = rec;
            } else {
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithUserSettingsQuestForeignKey(
  allQuestions,
  questForeignKey
) {
  try {
    if (questForeignKey === "" || questForeignKey === undefined) {
      return allQuestions;
    } else {
      const userQuestSettings = await UserQuestSetting.find({
        questForeignKey: questForeignKey,
      });
      // //console.log(
      //   "🚀 ~ getQuestionsWithUserSettings ~ userQuestSettings:",
      //   userQuestSettings
      // );

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await userQuestSettings.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            rcrd.userQuestSetting = rec;
            // if (
            //   rcrd.usersChangeTheirAns?.trim() !== "" ||
            //   rcrd.whichTypeQuestion === "ranked choise"
            // ) {
            //   rcrd.startStatus = "change answer";
            //   rcrd.startQuestData = rec;
            // } else {
            //   rcrd.startStatus = "completed";
            //   rcrd.startQuestData = rec;
            // }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

// Controller function to check if ID exists in the database collection
const checkMediaDuplicateUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Construct a regex pattern to match the YouTube URL format
    const regex = new RegExp(`${id}`, "i");

    // Use the regex pattern in the find query
    const question = await InfoQuestQuestions.findOne({
      url: regex,
      isActive: true,
    });

    if (question) {
      // ID exists in the URL field, return an error
      return res
        .status(400)
        .json({ error: "This link already exists.", duplicate: true });
    }

    // ID does not exist in the URL field, continue with other operations
    // For example, you can insert the ID into the database here

    res.status(200).json({
      message:
        "Link does not exist in the URL field. Proceed with other operations.",
      duplicate: false,
    });
  } catch (error) {
    console.error("Error checking ID in URL field:", error.message);
    res
      .status(500)
      .json({ error: `Error checking ID in URL field: ${error.message}` });
  }
};

const checkGifDuplicateUrl = async (req, res) => {
  try {
    const { url } = req.params;
    const question = await InfoQuestQuestions.findOne({
      url: url,
      isActive: true,
    });

    if (question) {
      return res
        .status(400)
        .json({ error: "This link already exists.", duplicate: true });
    }
    res.status(200).json({
      message:
        "Link does not exist in the URL field. Proceed with other operations.",
      duplicate: false,
    });
  } catch (error) {
    console.error("Error checking ID in URL field:", error.message);
    res
      .status(500)
      .json({ error: `Error checking ID in URL field: ${error.message}` });
  }
};

// Function to get the final redirect URL from a short URL
function getFinalRedirectSoundCloud(shortUrl) {
  const command = `curl -Ls -o /dev/null -w %{url_effective} ${shortUrl}`;
  return execSync(command, { encoding: "utf-8" }).trim();
}

// Controller function to check if ID exists in the database collection
const getFullSoundcloudUrlFromShortUrl = async (req, res) => {
  const shortUrl = req.query.shortUrl;

  if (!shortUrl) {
    return res.status(400).json({ error: "Short URL parameter is missing" });
  }

  try {
    const finalUrl = getFinalRedirectSoundCloud(shortUrl);
    res.json({ finalUrl });
  } catch (error) {
    console.error("Error retrieving final redirect URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to check if ID exists in the database collection
const getFlickerUrl = async (req, res) => {
  try {
    // Extract the Flickr photo URL from the query parameters
    const flickrUrl = req.query.url;

    // Make a GET request to Flickr's API with the dynamic URL
    const response = await fetch(
      `http://www.flickr.com/services/oembed/?format=json&url=${encodeURIComponent(
        flickrUrl
      )}`
    );

    // Check if the response is successful
    if (!response.ok) {
      if (response.status === 429) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }
      throw new Error("Invalid Flickr photo URL");
    }

    // Parse the response as JSON
    const data = await response.json();

    // Check if the response from Flickr contains the image URL
    if (!data.url) {
      // If the response does not contain the image URL, throw an error
      throw new Error("Invalid Flickr photo URL");
    }

    // Extract the image URL from the response data
    const imageUrl = data.url;

    // Return the image URL as the API response
    res.json({ imageUrl });
  } catch (error) {
    // If an error occurs, return an error response
    console.error(error);
    res.status(500).json({ message: `${error.message}` });
  }
};

module.exports = {
  createInfoQuestQuest,
  deleteInfoQuestQuest,
  constraintForUniqueQuestion,
  getAllQuests,
  getAllQuestsWithOpenInfoQuestStatus,
  getAllQuestsWithAnsweredStatus,
  getAllQuestsWithDefaultStatus,
  getAllQuestsWithResult,
  getQuestById,
  getAllQuestsWithCompletedStatus,
  getAllQuestsWithChangeAnsStatus,
  getQuestionsWithStatus,
  getQuestByUniqueShareLink,
  getQuestByUniqueId,
  getQuestionsWithUserSettings,
  checkMediaDuplicateUrl,
  checkGifDuplicateUrl,
  getFullSoundcloudUrlFromShortUrl,
  getFlickerUrl,
  getQuestsAll,
  suppressPost,
  getQuestByIdQuestForeignKey,
  getQuestionsWithStatusQuestForeignKey,
  getQuestionsWithUserSettingsQuestForeignKey,
};
