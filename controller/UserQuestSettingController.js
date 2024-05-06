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
const fs = require('fs');
const { updateUserBalance } = require("../utils/userServices");
const { updateTreasury } = require("../utils/treasuryService");
const { USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT } = require('../constants/index');
const nodeHtmlToImage = require("node-html-to-image");
const {
  sharedLinkDynamicImageHTML,
} = require("../templates/sharedLinkDynamicImageHTML");

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

const customLink = async (req, res) => {
  try {
    const payload = req.body;

    // Check if link already exist
    const userQuestSettingAlreadyExist = await UserQuestSetting.findOne({ link: payload.link });
    if (userQuestSettingAlreadyExist) return res.status(409).json({ message: `This link cannot be used, Try something unique like ${shortLink.generate(8)}` });

    // As link is unique Create Ledger and Proceed Normally like before with custom link.
    await ledgerDeductionPostLinkCustomized(payload.uuid)

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
            link: payload.link
          }
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
      message: `Share link ${status === "Disable"
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

    let updateData = {
      $set: { ...payload }, // Base the update object on the incoming payload
    };

    // Add 'hiddenTime' conditionally
    if (payload.hidden === true) {
      updateData.$set.hiddenTime = new Date(); // Set to the current timestamp
    }
    console.log(updateData);
    let userQuestSettingSaved;
    userQuestSettingSaved = await UserQuestSetting.findOneAndUpdate(
      // Query criteria
      { uuid: payload.uuid, questForeignKey: payload.questForeignKey },
      // Update or insert payload
      updateData,
      // Options
      { new: true, upsert: true }
    );
    const userQuestSettingExist = await UserQuestSetting.findOne({
      uuid: payload.uuid,
      questForeignKey: payload.questForeignKey,
    });
    // To check the record exist
    if (!userQuestSettingExist) throw new Error("userQuestSetting not exist");

    if (userQuestSettingExist && payload.hidden === true) {
      // Document found, update hiddenTime and save
      userQuestSettingExist.hiddenTime = new Date();
      await userQuestSettingExist.save();
    }

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
    const infoQuestQuestion = await InfoQuestQuestions.findOne({
      _id: payload.questForeignKey,
    });
    // if hidden
    if (payload.hidden) {
      await hiddenPostCount(infoQuestQuestion.uuid, true);
      await ledgerEntryAdded(payload.uuid, infoQuestQuestion.uuid);

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
      let suppressedReason = "";

      if (suppression) {
        suppressConditions.forEach((condition) => {
          if (item._id === condition.id && item.count > condition.minCount) {
            isSuppressed = true; // Set suppressed flag to true
            suppressedReason.push(condition.id);
          }
        });
      }

      // // Properly setting the fields to update with $set
      const resp = await InfoQuestQuestions.findOneAndUpdate(
        { _id: payload.questForeignKey },
        {
          $set: {
            suppressed: isSuppressed,
            suppressedReason,
          },
        },
        { new: true }
      );

      console.log("Suppression Response", resp);
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
    let suppressedReason = "";

    if (suppression) {
      suppression.map((item) => {
        if (suppression) {
          suppressConditions.forEach((condition) => {
            if (item._id === condition.id && item.count > condition.minCount) {
              isSuppressed = true;
              suppressedReason.push(condition.id);
            }
          });
        }
      });
    }

    // // Properly setting the fields to update with $set
    const resp = await InfoQuestQuestions.findOneAndUpdate(
      { _id: payload.questForeignKey },
      {
        $set: {
          suppressed: isSuppressed,
          suppressedReason,
        },
      },
      { new: true }
    );

    console.log("Suppression Response", resp);

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
      filterObj.createdBy = req.cookies.uuid;
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

const getAllHiddenQuests = async (req, res) => {
  try {
    const Questions = await BookmarkQuests.find({
      uuid: req.cookies.uuid,
    });
    // console.log(Questions);
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
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "linkCustomized",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "DAO Treasury",
      txAmount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
      txData: userQuestSetting_id,
      txDate: Date.now(),
      txDescription: "Quest Link Customized"
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "linkCustomized",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: uuid,
      txTo: "DAO Treasury",
      txAmount: 0,
      txData: userQuestSetting_id,
      txDate: Date.now(),
      txDescription: "Quest Link Customized"
    });
    // Increment the Treasury
    await updateTreasury({ amount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT, inc: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: uuid,
      amount: USER_QUEST_SETTING_LINK_CUSTOMIZATION_DEDUCTION_AMOUNT,
      dec: true,
    });
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
      txAuth: "DAO",
      txFrom: "dao",
      txTo: uuid,
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
    console.log("Req body", req.body);
    const { questStartData, link } = req.body;

    // Generate a image name for the image file
    const imgName = link + ".png";

    nodeHtmlToImage({
      output: `./assets/uploads/images/${imgName}`,
      html: sharedLinkDynamicImageHTML(questStartData),
    })
      .then(async () => {
        console.log("The image was created successfully!");

        // Read the image file from the backend directory
        const filePath = `./assets/uploads/images/${imgName}`;
        const fileBuffer = fs.readFileSync(filePath);

        // Upload the file to S3 bucket
        const s3UploadData = await s3ImageUpload({
          fileBuffer,
          fileName: imgName,
        });

        if (!s3UploadData) throw new Error("File not uploaded");

        console.log("s3UploadData", s3UploadData);

        const { imageName, s3Url } = s3UploadData;

        // Delete the file from the backend directory after uploading to S3
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
            return;
          }
          console.log("File deleted successfully");
        });

        console.log(imageName);

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

module.exports = {
  create,
  createOrUpdate,
  update,
  link,
  impression,
  status,
  ledgerDeductionPostLinkCustomized,
  sharedLinkDynamicImage,
  customLink
  // get,
};
