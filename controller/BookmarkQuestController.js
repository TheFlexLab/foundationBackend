const crypto = require("crypto");

const BookmarkQuests = require("../models/BookmarkQuests");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const { createLedger } = require("../utils/createLedger");

const createBookmarkQuest = async (req, res) => {
  try {
    const owner = await InfoQuestQuestions.findOne({
      _id: req.body.questForeignKey,
    });

    if (!owner) {
      return res.status(404).send("Owner not found");
    }

    const question = await new BookmarkQuests({
      Question: req.body.Question,
      questForeignKey: req.body.questForeignKey,
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
      whichTypeQuestion: req.body.whichTypeQuestion,
      createdBy: owner.uuid,
      moderationRatingCount: req.body.moderationRatingCount,
    });

    const questions = await question.save();
    !questions && res.status(404).send("Not Created 1");
    // Create Ledger
    await createLedger({
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
      txUserAction: "bookmarkAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      // txFrom: req.cookies.uuid,
      txFrom: req.body.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: questions._id,
      // txDescription : "User adds a quest to their bookmarks"
    });

    res.status(201).send({
      message: "Bookmarked Successfully",
      id: req.body.questForeignKey,
    });
  } catch (err) {
    res.status(500).send("Not Created 2" + err.message);
  }
};
const deleteBookmarkQuest = async (req, res) => {
  try {
    console.log(req.body.uuid)
    const questions = await BookmarkQuests.findOne({
      questForeignKey: req.body.questForeignKey,
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
    });
    await BookmarkQuests.deleteOne({
      questForeignKey: req.body.questForeignKey,
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
    });
    // Create Ledger
    await createLedger({
      // uuid: req.cookies.uuid,
      uuid: req.body.uuid,
      txUserAction: "bookmarkRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      // txFrom: req.cookies.uuid,
      txFrom: req.body.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: questions._id,
      // txDescription : "User removes a quest from their bookmarks"
    });
    res.status(201).send({
      message: "Unbookmarked Successfully",
      id: req.body.questForeignKey,
    });
  } catch (err) {
    res.status(500).send("Not Deleted 2" + err.message);
  }
};

// Not being use at FE, Send `req.body.uuid` in body 1st
const getAllBookmarkQuests = async (req, res) => {
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

// Not being use at FE, Send `req.body.uuid` in body 1st
const getAllBookmarkQuestions = async (req, res) => {
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
      // filterObj.createdBy = req.cookies.uuid;
      filterObj.createdBy = req.body.uuid;
    }

    const Questions = await BookmarkQuests.find(filterObj)
      .sort(req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt")
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

module.exports = {
  createBookmarkQuest,
  deleteBookmarkQuest,
  getAllBookmarkQuests,
  getAllBookmarkQuestions,
};
