const UserQuestSetting = require("../models/UserQuestSetting");
const shortLink = require("shortlink");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const UserModel = require("../models/UserModel");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const AWS = require("aws-sdk");
const { uploadS3Bucket } = require("../utils/uploadS3Bucket");
const path = require("path");
const { s3ImageUpload } = require("../utils/uploadS3Bucket");
const fs = require("fs");
const { updateUserBalance } = require("../utils/userServices");
const { updateTreasury } = require("../utils/treasuryService");
const {
  USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
  QUEST_COMPLETED_AMOUNT,
  POST_LINK,
} = require("../constants/index");
const nodeHtmlToImage = require("node-html-to-image");
const puppeteer = require("puppeteer");
const {
  sharedLinkDynamicImageHTML,
} = require("../templates/sharedLinkDynamicImageHTML");
const StartQuests = require("../models/StartQuests");
const {
  getPercentage,
  getPercentageQuestForeignKey,
} = require("../utils/getPercentage");

const createOrUpdate = async (req, res) => {
  try {
    const payload = {
      userId: "65c62e494dbb143f31639a34",
      questId: "65c62e5d4dbb143f31639a5e",
      hidden: true,
      generateLink: true,
    };
    // const payload = req.body;

    // To check the record exist
    const userQuestSettingExist = await UserQuestSetting.findOne({
      userId,
      questId,
    });
    // To Create
    if (!userQuestSettingExist) {
      // create
      // UserQuestSetting.create({ userId, questId, hidden });
      // return res.status(201).json({ message: "UserQuestSetting Created Successfully!" }); const userQuestSetting = new UserQuestSetting({ userId, questId, hidden });
      const userQuestSetting = new UserQuestSetting({
        userId,
        questId,
        ...settingField,
      });
      const savedUserQuestSetting = await userQuestSetting.save();
      return res
        .status(201)
        .json({ message: "UserQuestSetting Created Successfully!" });
    } else {
      // update
      UserQuestSetting.updateOne({ userId, questId, ...settingField });
      return res
        .status(200)
        .json({ message: "UserQuestSetting Updated Successfully!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while createOrUpdate UserQuestSetting: ${error.message}`,
    });
  }
};

const link = async (req, res) => {
  try {
    const payload = req.body;

    // if uniqueLink
    if (payload.isGenerateLink) {
      await ledgerEntryPostLinkCreated(payload.uuid);
      payload.link = shortLink.generate(8);
    }

    // To check the Question Description
    const infoQuestQuestion = await InfoQuestQuestions.findOne({
      _id: payload.questForeignKey,
    });

    const userQuestSettingExist = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
    });

    let savedOrUpdatedUserQuestSetting;
    // To check the record exist
    if (userQuestSettingExist) {
      savedOrUpdatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
        {
          uuid: payload.uuid,
          questForeignKey: payload.questForeignKey,
        },
        {
          // Update fields and values here
          $set: payload,
        },
        {
          new: true, // Return the modified document rather than the original
        }
      );
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
        route: "static_pages",
        title: "Foundation",
      });
    } else {
      // Create a short link
      const userQuestSetting = new UserQuestSetting({
        ...payload,
      });
      savedOrUpdatedUserQuestSetting = await userQuestSetting.save();
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
        route: "static_pages",
        title: "Foundation",
      });
    }

    const userSpent = await UserModel.findOne({ uuid: payload.uuid });
    userSpent.feeSchedual.creatingPostLinkFdx =
      userSpent.feeSchedual.creatingPostLinkFdx + POST_LINK;
    await userSpent.save();

    return res.status(201).json({
      message: "UserQuestSetting link Created Successfully!",
      data: savedOrUpdatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while create UserQuestSetting link: ${error.message}`,
    });
  }
};

async function linkUserList(payload) {
  try {
    // if uniqueLink
    if (payload.isGenerateLink) {
      await ledgerEntryPostLinkCreated(payload.uuid);
      payload.link = shortLink.generate(8);
    }

    // To check the Question Description
    const infoQuestQuestion = await InfoQuestQuestions.findOne({
      _id: payload.questForeignKey,
    });

    const userQuestSettingExist = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
    });

    let savedOrUpdatedUserQuestSetting;
    // To check the record exist
    if (userQuestSettingExist) {
      savedOrUpdatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
        {
          uuid: payload.uuid,
          questForeignKey: payload.questForeignKey,
        },
        {
          // Update fields and values here
          $set: payload,
        },
        {
          new: true, // Return the modified document rather than the original
        }
      );
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
      });
    } else {
      // Create a short link
      const userQuestSetting = new UserQuestSetting({
        ...payload,
      });
      savedOrUpdatedUserQuestSetting = await userQuestSetting.save();
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
      });
    }
    return {
      message: "UserQuestSetting link Created Successfully!",
      data: savedOrUpdatedUserQuestSetting,
    };
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while create UserQuestSetting link: ${error.message}`,
    });
  }
}

const customLink = async (req, res) => {
  try {
    const payload = req.body;

    // Check if link already exist
    const userQuestSettingAlreadyExist = await UserQuestSetting.findOne({
      link: payload.link,
    });
    if (userQuestSettingAlreadyExist)
      return res.status(409).json({
        message: `This link cannot be used, Try something unique like ${shortLink.generate(
          8
        )}`,
      });

    const user = await UserModel.findOne({ uuid: req.body.uuid });
    if (user.balance < USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT) {
      return res.status(409).json({
        message: `Insufficient balance`,
      });
    }

    // Check if link already customized
    const linkCustomized = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
      linkCustomized: true,
    });
    if (linkCustomized)
      return res.status(409).json({ message: `Link is already Customized.` });

    // As link is unique Create Ledger and Proceed Normally like before with custom link.
    await ledgerDeductionPostLinkCustomized(payload.uuid);

    user.fdxSpent =
      user.fdxSpent + USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT;
    user.feeSchedual.creatingPostCustomLinkFdx =
      user.feeSchedual.creatingPostCustomLinkFdx +
      USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT;
    await user.save();

    const userQuestSettingExist = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
    });

    let savedOrUpdatedUserQuestSetting;
    // To check the record exist
    if (userQuestSettingExist) {
      savedOrUpdatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
        {
          uuid: payload.uuid,
          questForeignKey: payload.questForeignKey,
        },
        {
          $set: {
            link: payload.link,
            linkCustomized: true,
          },
        },
        {
          new: true, // Return the modified document rather than the original
        }
      );
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
        route: "static_pages",
        title: "Foundation",
      });
    } else {
      // Create a short link
      const userQuestSetting = new UserQuestSetting({
        ...payload,
      });
      savedOrUpdatedUserQuestSetting = await userQuestSetting.save();
      await uploadS3Bucket({
        fileName: savedOrUpdatedUserQuestSetting.link,
        description: savedOrUpdatedUserQuestSetting.Question,
        route: "static_pages",
        title: "Foundation",
      });
    }

    return res.status(201).json({
      message: "UserQuestSetting link Created Successfully!",
      data: savedOrUpdatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while create UserQuestSetting link: ${error.message}`,
    });
  }
};

const impression = async (req, res) => {
  try {
    const { link } = req.params;

    // Update the document using findOneAndUpdate with $inc operator
    const updatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
      { link, linkStatus: "Enable" },
      { $inc: { questImpression: 1 } }, // Increment questImpression field by 1
      { new: true } // Return the updated document
    );

    if (!updatedUserQuestSetting) {
      // If the document doesn't exist, you may want to handle this case
      return res.status(404).json({ message: "UserQuestSetting not found" });
    }

    return res.status(201).json({
      message: "UserQuestSetting link Updated Successfully!",
      data: updatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while updating UserQuestSetting link: ${error.message}`,
    });
  }
};

const status = async (req, res) => {
  try {
    const { link } = req.params;
    const { status } = req.body;
    let updatedUserQuestSetting;
    if (status === "Delete") {
      updatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
        { link },
        {
          linkStatus: status,
          link: "",
          questImpression: 0,
          questsCompleted: 0,
          $unset: { result: "" }, // This removes the "result" field from the document
        },
        { new: true }
      );
    } else {
      updatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
        { link },
        { linkStatus: status },
        { new: true }
      );
    }
    if (!updatedUserQuestSetting) {
      return res.status(404).json({ message: "Share link not found" });
    }
    return res.status(200).json({
      message: `Share link ${
        status === "Disable"
          ? "Disabled"
          : status === "Delete"
          ? "Deleted"
          : "Enabled"
      } Successfully`,
      data: updatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while changing link status: ${error.message}`,
    });
  }
};
const suppressConditions = [
  { id: "Has Mistakes or Errors", minCount: 2 },
  { id: "Needs More Options", minCount: 2 },
  { id: "Unclear / Doesn’t make Sense", minCount: 2 },
  { id: "Duplicate / Similar Post", minCount: 2 },
];

const createFeedback = async (req, res) => {
  try {
    const { feedbackMessage, questForeignKey, uuid, Question, historyDate } =
      req.body;

    const isOwner = await InfoQuestQuestions.findOne({
      _id: questForeignKey,
      uuid: uuid,
    });
    if (isOwner)
      res
        .status(403)
        .json({ message: "You cannot give feedback or hide your own post." });

    const userQuestSetting = await UserQuestSetting.findOne({
      uuid: uuid,
      questForeignKey: questForeignKey,
    });

    let isHistorical = false;
    if (feedbackMessage === "Historical / Past Event") {
      const checkHistorical = await UserQuestSetting.findOne({
        questForeignKey: questForeignKey,
        feedbackMessage: feedbackMessage,
        historyDate: historyDate,
      });
      if (checkHistorical) isHistorical = true;
    }

    let addOption = false;
    if (feedbackMessage === "Needs More Options") {
      addOption = true;
    }

    let questSetting;
    if (!userQuestSetting) {
      const userQuestSettingModel = new UserQuestSetting({
        feedbackMessage: feedbackMessage,
        questForeignKey: questForeignKey,
        uuid: uuid,
        Question: Question,
        feedbackTime: new Date(),
        historyDate: historyDate ? historyDate : null,
      });
      questSetting = await userQuestSettingModel.save();
      const startQuestExist = await StartQuests.findOne({
        uuid: uuid,
        questForeignKey: questForeignKey,
      });
      if (!startQuestExist) {
        const startQuestModel = new StartQuests({
          addedAnswer: "",
          addedAnswerUuid: "",
          data: [],
          isAddedAnsSelected: "",
          questForeignKey: questForeignKey,
          uuid: uuid,
          isFeedback: true,
        });
        await startQuestModel.save();
      } else {
        startQuestExist.isFeedback = true;
        await startQuestExist.save();
      }

      if (isHistorical) {
        await InfoQuestQuestions.findOneAndUpdate(
          {
            _id: questForeignKey,
          },
          {
            isClosed: true,
          }
        ).exec();
      }

      const suppression = await UserQuestSetting.aggregate([
        {
          $match: {
            feedbackMessage: { $ne: "", $exists: true },
            questForeignKey: questForeignKey,
          },
        },
        {
          $group: {
            _id: "$feedbackMessage",
            count: { $sum: 1 },
          },
        },
      ]);
      let isSuppressed = false;

      if (suppression) {
        suppression.map((item) => {
          if (suppression) {
            suppressConditions.forEach(async (condition) => {
              if (
                item._id === "Needs More Options" &&
                item.count >= condition.minCount
              ) {
                await InfoQuestQuestions.findOneAndUpdate(
                  {
                    _id: questForeignKey,
                  },
                  { $set: { usersAddTheirAns: true } }
                ).exec();
              } else if (
                item._id === condition.id &&
                item.count >= condition.minCount &&
                item._id !== "Needs More Options"
              ) {
                isSuppressed = true;
              }
            });
          }
        });
      }

      // // Properly setting the fields to update with $set
      await InfoQuestQuestions.findOneAndUpdate(
        { _id: questForeignKey },
        {
          $set: {
            suppressed: isSuppressed,
          },
        },
        { new: true }
      );

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: uuid,
        txUserAction: "postFeedBackGiven",
        txID: txID,
        txAuth: "User",
        txFrom: uuid,
        txTo: "dao",
        txAmount: "0",
        txData: questForeignKey,
        // txDescription : "User completes a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: uuid,
        txUserAction: "postFeedBackGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: uuid,
        txAmount: QUEST_COMPLETED_AMOUNT,
        txData: questForeignKey,
        // txDescription : "Incentive for completing quests"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_COMPLETED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: uuid,
        amount: QUEST_COMPLETED_AMOUNT,
        inc: true,
      });

      const formatSetting = await InfoQuestQuestions.findOne({
        _id: questSetting.questForeignKey,
      }).populate("getUserBadge", "badges");

      const resultDoc = getPercentageQuestForeignKey(formatSetting);

      const formattedDoc = {
        ...formatSetting._doc,
        startStatus:
          feedbackMessage === "Needs More Options" ? "continue" : "completed",
        selectedPercentage: resultDoc?.selectedPercentage?.[0]
          ? [
              Object.fromEntries(
                Object.entries(resultDoc.selectedPercentage[0]).sort(
                  (a, b) => parseInt(b[1]) - parseInt(a[1])
                )
              ),
            ]
          : [],
        contendedPercentage: resultDoc?.contendedPercentage?.[0]
          ? [
              Object.fromEntries(
                Object.entries(resultDoc.contendedPercentage[0]).sort(
                  (a, b) => parseInt(b[1]) - parseInt(a[1])
                )
              ),
            ]
          : [],
        startQuestData: await StartQuests.findOne({
          uuid: uuid,
          questForeignKey: questForeignKey,
          isFeedback: true,
        }),
        userQuestSetting: questSetting,
      };

      return res.status(201).json({
        message: "Feedback Submitted Successfully!",
        data: formattedDoc,
      });
    } else {
      if (userQuestSetting.feedbackMessage !== "")
        return res.status(403).json({ message: "Feedback is already given" });

      userQuestSetting.feedbackTime = new Date();
      userQuestSetting.feedbackMessage = feedbackMessage;
      userQuestSetting.historyDate = historyDate
        ? historyDate
        : userQuestSetting.historyDate;
      const updatedUserQuestSetting = await userQuestSetting.save();

      const startQuestExist = await StartQuests.findOne({
        uuid: uuid,
        questForeignKey: questForeignKey,
      });
      if (!startQuestExist) {
        const startQuestModel = new StartQuests({
          addedAnswer: "",
          addedAnswerUuid: "",
          data: [],
          isAddedAnsSelected: "",
          questForeignKey: questForeignKey,
          uuid: uuid,
          isFeedback: true,
        });
        await startQuestModel.save();
      } else {
        startQuestExist.isFeedback = true;
        await startQuestExist.save();
      }

      if (isHistorical) {
        await InfoQuestQuestions.findOneAndUpdate(
          {
            _id: questForeignKey,
          },
          {
            isClosed: true,
          }
        ).exec();
      }

      if (addOption) {
        await InfoQuestQuestions.findOneAndUpdate(
          {
            _id: questForeignKey,
          },
          {
            isAddOptionFeedback: true,
            usersAddTheirAns: true,
          }
        ).exec();
      }

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: uuid,
        txUserAction: "postFeedBackGiven",
        txID: txID,
        txAuth: "User",
        txFrom: uuid,
        txTo: "dao",
        txAmount: "0",
        txData: questForeignKey,
        // txDescription : "User completes a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: uuid,
        txUserAction: "postFeedBackGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: uuid,
        txAmount: QUEST_COMPLETED_AMOUNT,
        txData: questForeignKey,
        // txDescription : "Incentive for completing quests"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_COMPLETED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: uuid,
        amount: QUEST_COMPLETED_AMOUNT,
        inc: true,
      });

      const formatSetting = await InfoQuestQuestions.findOne({
        _id: updatedUserQuestSetting.questForeignKey,
      }).populate("getUserBadge", "badges");

      const resultDoc = getPercentageQuestForeignKey(formatSetting);

      const formattedDoc = {
        ...formatSetting._doc,
        startStatus:
          feedbackMessage === "Needs More Options" ? "continue" : "completed",
        startQuestData: await StartQuests.findOne({
          uuid: uuid,
          questForeignKey: questForeignKey,
          isFeedback: true,
        }),
        userQuestSetting: updatedUserQuestSetting,
        selectedPercentage: resultDoc?.selectedPercentage?.[0]
          ? [
              Object.fromEntries(
                Object.entries(resultDoc.selectedPercentage[0]).sort(
                  (a, b) => parseInt(b[1]) - parseInt(a[1])
                )
              ),
            ]
          : [],
        contendedPercentage: resultDoc?.contendedPercentage?.[0]
          ? [
              Object.fromEntries(
                Object.entries(resultDoc.contendedPercentage[0]).sort(
                  (a, b) => parseInt(b[1]) - parseInt(a[1])
                )
              ),
            ]
          : [],
      };

      return res.status(201).json({
        message: "Feedback Submitted Successfully!",
        data: formattedDoc,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while Feedback UserQuestSetting: ${error.message}`,
    });
  }
};

const updateFeedback = async (req, res) => {
  try {
    const { feedbackMessage, questForeignKey, uuid } = req.body;

    const userQuestSetting = await UserQuestSetting.findOne({
      uuid: uuid,
      questForeignKey: questForeignKey,
    });
    userQuestSetting.feedbackTime = new Date();
    userQuestSetting.feedbackMessage = feedbackMessage;
    const updatedUserQuestSetting = await userQuestSetting.save();

    return res.status(201).json({
      message: "Feedback Updated Successfully!",
      data: updatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while Feedback UserQuestSetting: ${error.message}`,
    });
  }
};

const create = async (req, res) => {
  try {
    const payload = req.body;

    // if uniqueLink
    // if(payload.linkStatus === "Enable"){
    //   await ledgerEntryPostLinkCreated(payload.uuid);
    //   payload.link = shortLink.generate(8);
    // }

    // const userQuestSettingExist = await UserQuestSetting.findOne({
    //   uuid: payload.uuid,
    //   questForeignKey: payload.questForeignKey,
    // });

    // let updateData = {
    //   $set: { ...payload }, // Base the update object on the incoming payload
    // };

    // // Add 'hiddenTime' conditionally
    // if (payload.hidden === true) {
    //   updateData.$set.hiddenTime = new Date(); // Set to the current timestamp
    // }
    // //console.log(updateData);
    // let userQuestSettingSaved;
    // userQuestSettingSaved = await UserQuestSetting.findOneAndUpdate(
    //   // Query criteria
    //   { uuid: payload.uuid, questForeignKey: payload.questForeignKey },
    //   // Update or insert payload
    //   updateData,
    //   // Options
    //   { new: true, upsert: true }
    // );
    // const userQuestSettingExist = await UserQuestSetting.findOne({
    //   uuid: payload.uuid,
    //   questForeignKey: payload.questForeignKey,
    // });
    // // To check the record exist
    // if (!userQuestSettingExist) throw new Error("userQuestSetting not exist");

    // if (userQuestSettingExist && payload.hidden === true) {
    //   // Document found, update hiddenTime and save
    //   userQuestSettingExist.hiddenTime = new Date();
    //   await userQuestSettingExist.save();
    // }

    const isOwner = await InfoQuestQuestions.findOne({
      _id: req.body.questForeignKey,
      uuid: req.body.uuid,
    });
    if (isOwner)
      res
        .status(403)
        .json({ message: "You cannot give feedback or hide your own post." });

    let userQuestSettingSaved = await UserQuestSetting.findOne({
      uuid: req.body.uuid,
      questForeignKey: req.body.questForeignKey,
    });
    if (!userQuestSettingSaved)
      return res.status(404).json({ message: "userQuestSetting not exist" });

    userQuestSettingSaved.Question = payload.Question;
    userQuestSettingSaved.hidden = payload.hidden;
    userQuestSettingSaved.hiddenMessage = payload.hiddenMessage;
    userQuestSettingSaved.hiddenTime = new Date();
    await userQuestSettingSaved.save();

    // To check the record exist
    // if (userQuestSettingExist){
    //    // If the record exists, update it
    //    userQuestSettingSaved = await UserQuestSetting.findOneAndUpdate(
    //     {
    //       uuid: payload.uuid,
    //       questForeignKey: payload.questForeignKey,
    //     },
    //     {
    //       // Update fields and values here
    //       $set: payload,
    //     },
    //     {
    //       new: true, // Return the modified document rather than the original
    //     }
    //   );
    // } else {
    //   // Create
    //   const userQuestSetting = new UserQuestSetting({
    //     ...payload,
    //   });
    //   userQuestSettingSaved = await userQuestSetting.save();
    // }

    // Get quest owner uuid
    // const infoQuestQuestion = await InfoQuestQuestions.findOne({
    //   _id: payload.questForeignKey,
    // });

    // const suppression = await UserQuestSetting.aggregate([
    //   {
    //     $match: {
    //       feedbackMessage: { $ne: "", $exists: true },
    //       questForeignKey: payload.questForeignKey,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$feedbackMessage",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);
    // let isSuppressed = false;

    // if (suppression) {
    //   suppression.map((item) => {
    //     if (suppression) {
    //       suppressConditions.forEach(async (condition) => {
    //         if (
    //           item._id === "Needs More Options" &&
    //           item.count >= condition.minCount
    //         ) {
    //           await InfoQuestQuestions.findOneAndUpdate(
    //             {
    //               _id: payload.questForeignKey,
    //             },
    //             { $set: { usersAddTheirAns: true } }
    //           ).exec();
    //         } else if (
    //           item._id === condition.id &&
    //           item.count >= condition.minCount &&
    //           item._id !== "Needs More Options"
    //         ) {
    //           isSuppressed = true;
    //         }
    //       });
    //     }
    //   });
    // }

    // // Properly setting the fields to update with $set
    // await InfoQuestQuestions.findOneAndUpdate(
    //   { _id: payload.questForeignKey },
    //   {
    //     $set: {
    //       suppressed: isSuppressed,
    //     },
    //   },
    //   { new: true }
    // );
    // if hidden
    if (payload.hidden) {
      await hiddenPostCount(infoQuestQuestion.uuid, true);
      await ledgerEntryAdded(payload.uuid, infoQuestQuestion.uuid);
    } else if (payload.hidden === false) {
      await hiddenPostCount(infoQuestQuestion.uuid, false);
      await ledgerEntryRemoved(payload.uuid, infoQuestQuestion.uuid);
    }

    return res.status(201).json({
      message: "UserQuestSetting Upsert Successfully!",
      data: userQuestSettingSaved,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while create UserQuestSetting: ${error.message}`,
    });
  }
};

const update = async (req, res) => {
  try {
    const payload = req.body;

    const userQuestSettingExist = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
    });
    // To check the record exist
    if (!userQuestSettingExist) throw new Error("userQuestSetting not exist");

    const isPostSuppressed = await InfoQuestQuestions.findOne({
      _id: payload.questForeignKey,
      suppressed: true,
    });
    if (isPostSuppressed)
      throw new Error(
        "Unfortunately, this post has been suppressed and cannot be unhidden."
      );

    if (userQuestSettingExist && payload.hidden === true) {
      // Document found, update hiddenTime and save
      userQuestSettingExist.hiddenTime = new Date();
      await userQuestSettingExist.save();
    }

    // if uniqueLink
    // if(payload.uniqueLink){
    //   await ledgerEntryPostLinkCreated(payload.uuid);
    //   payload.link = shortLink.generate(8);
    // }

    let updateData = {
      $set: { ...payload }, // Base the update object on the incoming payload
    };

    // Add 'hiddenTime' conditionally
    if (payload.hidden === true) {
      updateData.$set.hiddenTime = new Date(); // Set to the current timestamp
    }
    // If the record exists, update it
    const updatedUserQuestSetting = await UserQuestSetting.findOneAndUpdate(
      {
        uuid: payload.uuid,
        questForeignKey: payload.questForeignKey,
      },
      updateData,
      {
        new: true, // Return the modified document rather than the original
      }
    );

    // Get quest owner uuid
    const infoQuestQuestion = await InfoQuestQuestions.findOne({
      _id: payload.questForeignKey,
    });
    // if hidden
    if (payload.hidden) {
      await hiddenPostCount(infoQuestQuestion.uuid, true);
      await ledgerEntryAdded(payload.uuid, infoQuestQuestion.uuid);
    } else if (payload.hidden === false) {
      await hiddenPostCount(infoQuestQuestion.uuid, false);
      await ledgerEntryRemoved(payload.uuid, infoQuestQuestion.uuid);
    }

    //QUERY TO CHECK SUPPRESSION OF post
    const suppression = await UserQuestSetting.aggregate([
      {
        $match: {
          hidden: true,
          questForeignKey: payload.questForeignKey,
        },
      },
      {
        $group: {
          _id: "$hiddenMessage",
          count: { $sum: 1 },
        },
      },
    ]);
    let isSuppressed = false;

    if (suppression) {
      suppression.map((item) => {
        if (suppression) {
          suppressConditions.forEach(async (condition) => {
            if (
              item._id === "Needs More Options" &&
              item.count >= condition.minCount
            ) {
              await InfoQuestQuestions.findOneAndUpdate(
                {
                  _id: payload.questForeignKey,
                },
                { $set: { usersAddTheirAns: true } }
              ).exec();
            } else if (
              item._id === condition.id &&
              item.count >= condition.minCount &&
              item._id !== "Needs More Options"
            ) {
              isSuppressed = true;
            }
          });
        }
      });
    }

    // // Properly setting the fields to update with $set
    await InfoQuestQuestions.findOneAndUpdate(
      { _id: payload.questForeignKey },
      {
        $set: {
          suppressed: isSuppressed,
        },
      },
      { new: true }
    );

    return res.status(201).json({
      message: "UserQuestSetting Updated Successfully!",
      data: updatedUserQuestSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while update UserQuestSetting: ${error.message}`,
    });
  }
};

// Use req.body.uuid
const getAllHiddenQuestions = async (req, res) => {
  try {
    const { uuid, _page, _limit } = req.body;
    const page = parseInt(_page);
    const pageSize = parseInt(_limit);

    // Calculate the number of documents to skip to get to the desired page
    const skip = (page - 1) * pageSize;
    let filterObj = { uuid: uuid };

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.filter === true) {
      filterObj.createdBy = req.body.uuid;
      // filterObj.createdBy = req.cookies.uuid;
    }

    const Questions = await BookmarkQuests.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    const mapPromises = Questions.map(async function (record) {
      return InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      });
    });

    const response = await Promise.all(mapPromises);
    res.status(200).json(response);
  } catch (err) {
    res.status(500).send(err);
  }
};

// Use req.body.uuid
const getAllHiddenQuests = async (req, res) => {
  try {
    const Questions = await BookmarkQuests.find({
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
    });
    // //console.log(Questions);
    res.status(200).json(Questions);
  } catch (err) {
    res.status(500).send(err);
  }
};

const hiddenPostCount = async (uuid, hidden) => {
  try {
    // increment
    await UserModel.updateOne(
      { uuid },
      { $inc: { yourHiddenPostCounter: hidden ? 1 : -1 } }
    );
  } catch (error) {
    console.error(error);
  }
};

const ledgerEntryPostLinkCreated = async (uuid) => {
  try {
    // User
    await createLedger({
      uuid: uuid,
      txUserAction: "postLinkCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
  } catch (error) {
    console.error(error);
  }
};

const ledgerDeductionPostLinkCustomized = async (uuid, userQuestSetting_id) => {
  try {
    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "postLinkCreatedCustom",
      txID: txID,
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: 0,
      txData: userQuestSetting_id,
      txDate: Date.now(),
      txDescription: "Quest Link Customized",
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "postLinkCreatedCustom",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: uuid,
      txAmount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
      txData: userQuestSetting_id,
      txDate: Date.now(),
      txDescription: "Quest Link Customized",
    });
    // Increment the Treasury
    await updateTreasury({
      amount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
      inc: true,
    });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: uuid,
      amount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
      dec: true,
    });
    const userSpent = await UserModel.findOne({ uuid: uuid });
    userSpent.fdxSpent =
      userSpent.fdxSpent +
      USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT;
    await userSpent.save();
  } catch (error) {
    console.error(error);
  }
};

const ledgerEntryAdded = async (uuid, questOwnerUuid) => {
  try {
    // User
    await createLedger({
      uuid: uuid,
      txUserAction: "postHiddenAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    await createLedger({
      uuid: questOwnerUuid,
      txUserAction: "postHiddenAddedUser",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: questOwnerUuid,
      txTo: "dao",
      txAmount: "0",
      txData: questOwnerUuid,
      // txDescription : "User creates a new account"
    });
  } catch (error) {
    console.error(error);
  }
};

const ledgerEntryRemoved = async (uuid, questOwnerUuid) => {
  try {
    // User
    await createLedger({
      uuid: uuid,
      txUserAction: "postHiddenRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    await createLedger({
      uuid: questOwnerUuid,
      txUserAction: "postHiddenRemovedUser",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: questOwnerUuid,
      txTo: "dao",
      txAmount: "0",
      txData: questOwnerUuid,
      // txDescription : "User creates a new account"
    });
  } catch (error) {
    console.error(error);
  }
};

// const get = async (req, res) => {
//   try {
//     const getTreasury = await Treasury.findOne();
//     res.status(200).json({
//       data: getTreasury?.amount?.toString(),
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: ` An error occurred while get Treasury: ${error.message}`,
//     });
//   }
// };

const sharedLinkDynamicImage = async (req, res) => {
  try {
    //console.log("Req body", req.body);
    const { questStartData, link } = req.body;

    // Generate a image name for the image file
    const imgName = link + ".png";

    // Set Puppeteer options with --no-sandbox flag
    const puppeteerOptions = {
      args: ["--no-sandbox"],
    };

    nodeHtmlToImage({
      output: `./assets/uploads/images/${imgName}`,
      html: sharedLinkDynamicImageHTML(questStartData),
      puppeteerArgs: puppeteerOptions,
    })
      .then(async () => {
        //console.log("The image was created successfully!");

        // Read the image file from the backend directory
        const filePath = `./assets/uploads/images/${imgName}`;
        const fileBuffer = fs.readFileSync(filePath);

        // Upload the file to S3 bucket
        const s3UploadData = await s3ImageUpload({
          fileBuffer,
          fileName: imgName,
        });

        if (!s3UploadData) throw new Error("File not uploaded");

        //console.log("s3UploadData", s3UploadData);

        const { imageName, s3Url } = s3UploadData;

        // Delete the file from the backend directory after uploading to S3
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
            return;
          }
          //console.log("File deleted successfully");
        });

        //console.log(imageName);

        const userQuestSettingUpdate = await UserQuestSetting.findOneAndUpdate(
          { link: req.body.link },
          { image: s3Url },
          { new: true }
        );

        if (!userQuestSettingUpdate)
          throw new Error("userQuestSetting not updated");

        return res.status(200).json({
          success: true,
          imageName: imageName,
          s3Url: s3Url,
          userQuestSetting: userQuestSettingUpdate,
        });
      })
      .catch((error) => {
        console.error("Error generating image:", error);
        return res.status(500).json({
          message: `An error occurred while generating image: ${error.message}`,
        });
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: `An error occurred on shaedLinkDynamicImage: ${error.message}`,
    });
  }
};

async function sharedLinkDynamicImageUserList(link, questStartData) {
  try {
    // Generate a image name for the image file
    const imgName = link + ".png";

    // Set Puppeteer options with --no-sandbox flag
    const puppeteerOptions = {
      args: ["--no-sandbox"],
    };

    nodeHtmlToImage({
      output: `./assets/uploads/images/${imgName}`,
      html: sharedLinkDynamicImageHTML(questStartData),
      puppeteerArgs: puppeteerOptions,
    })
      .then(async () => {
        //console.log("The image was created successfully!");

        // Read the image file from the backend directory
        const filePath = `./assets/uploads/images/${imgName}`;
        const fileBuffer = fs.readFileSync(filePath);

        // Upload the file to S3 bucket
        const s3UploadData = await s3ImageUpload({
          fileBuffer,
          fileName: imgName,
        });

        if (!s3UploadData) throw new Error("File not uploaded");

        //console.log("s3UploadData", s3UploadData);

        const { imageName, s3Url } = s3UploadData;

        // Delete the file from the backend directory after uploading to S3
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
            return;
          }
          //console.log("File deleted successfully");
        });

        //console.log(imageName);

        const userQuestSettingUpdate = await UserQuestSetting.findOneAndUpdate(
          { link: link },
          { image: s3Url },
          { new: true }
        );

        if (!userQuestSettingUpdate)
          throw new Error("userQuestSetting not updated");

        return {
          success: true,
          imageName: imageName,
          s3Url: s3Url,
          userQuestSetting: userQuestSettingUpdate,
        };
      })
      .catch((error) => {
        console.error("Error generating image:", error);
        throw new Error({
          message: `An error occurred while generating image: ${error.message}`,
        });
      });
  } catch (error) {
    console.error(error);
    return {
      message: `An error occurred on shaedLinkDynamicImage: ${error.message}`,
    };
  }
}

module.exports = {
  create,
  createOrUpdate,
  update,
  link,
  impression,
  status,
  ledgerDeductionPostLinkCustomized,
  sharedLinkDynamicImage,
  customLink,
  linkUserList,
  sharedLinkDynamicImageUserList,
  createFeedback,
  updateFeedback,
  // get,
};
