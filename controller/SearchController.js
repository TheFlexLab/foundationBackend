const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const BookmarkQuests = require("../models/BookmarkQuests");
const {
  getQuestionsWithStatus,
  getQuestionsWithUserSettings,
} = require("./InfoQuestQuestionController");
const { getPercentage } = require("../utils/getPercentage");
const UserQuestSetting = require("../models/UserQuestSetting");
const Cities = require("../models/Cities");
const Education = require("../models/Education");
const Company = require("../models/Company");
const JobTitle = require("../models/JobTitle");
const DegreeAndFieldOfStudy = require("../models/DegreeAndFieldOfStudy");
const easySearch = async (req, res) => {
  const searchTerm = req.query.term || "";
  const uuid = req.body.uuid;

  const { moderationRatingFilter } = req.body;

  try {
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );
    const results = await InfoQuestQuestions.find({
      $or: [
        { Question: { $regex: searchTerm, $options: "i" } },
        { whichTypeQuestion: { $regex: searchTerm, $options: "i" } },
        { "QuestAnswers.question": { $regex: searchTerm, $options: "i" } },
        { QuestTopic: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
      _id: { $nin: hiddenUserSettingIds },
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    }).populate("getUserBadge", "badges");

    const resultArray = results.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
    }));

    // Query the database with skip and limit options to get questions for the requested page
    const result = await getQuestionsWithStatus(desiredArray, uuid);

    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    res.status(200).json({
      data: result1,
      hasNextPage: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

const searchBookmarks = async (req, res) => {
  const searchTerm = req.query.term;
  const uuid = req.cookies.uuid;
  const { moderationRatingFilter } = req.body;
  try {
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });
    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    const infoQuestQuestions = await InfoQuestQuestions.find({
      $or: [
        { Question: { $regex: searchTerm, $options: "i" } },
        { whichTypeQuestion: { $regex: searchTerm, $options: "i" } },
        { "QuestAnswers.question": { $regex: searchTerm, $options: "i" } },
        { QuestTopic: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
      _id: { $nin: hiddenUserSettingIds },
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    }).populate("getUserBadge", "badges");

    // Extract QuestId from infoQuestQuestions
    const questIds = infoQuestQuestions.map((ob) => ob._id);

    const results = await BookmarkQuests.find({
      questForeignKey: { $in: questIds },
      // Question: { $regex: searchTerm, $options: "i" },
      uuid: uuid,
    });

    const reversedResults = results.reverse();
    const mapPromises = reversedResults.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      });
    });

    const allQuestions = await Promise.all(mapPromises);

    const resultArray = allQuestions.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
    }));

    // Call getQuestionsWithStatus and await its result
    const questionsWithStatus = await getQuestionsWithStatus(
      desiredArray,
      uuid
    );
    // getQuestionsWithUserSettings
    const result = await getQuestionsWithUserSettings(
      questionsWithStatus,
      uuid
    );

    res.status(200).json({
      data: result,
      hasNextPage: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

const searchHiddenQuest = async (req, res) => {
  const searchTerm = req.query.term;
  const uuid = req.cookies.uuid;
  try {
    const results = await UserQuestSetting.find({
      Question: { $regex: searchTerm, $options: "i" },
      uuid: uuid,
    });

    const reversedResults = results.reverse();
    const mapPromises = reversedResults.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      });
    });

    const allQuestions = await Promise.all(mapPromises);

    const resultArray = allQuestions.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
    }));

    // Call getQuestionsWithStatus and await its result
    const questionsWithStatus = await getQuestionsWithStatus(
      desiredArray,
      uuid
    );
    // getQuestionsWithUserSettings
    const result = await getQuestionsWithUserSettings(
      questionsWithStatus,
      uuid
    );

    res.status(200).json({
      data: result,
      hasNextPage: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

const searchCities = async (req, res) => {
  const query = req.query.name.trim();

  try {
    let data;

    // Split the query string using commas and spaces as delimiters
    const queryTerms = query
      .split(/[\s,]+/)
      .filter((term) => term.trim() !== "");

    // Extract city name from the first term
    const cityName = queryTerms.shift().replace(",", "");

    // Construct the database query
    const queryConditions = { name: new RegExp(cityName, "i") };

    // Check for additional country/state names
    if (queryTerms.length > 0) {
      const countryOrStateName = queryTerms.join(" ").replace(",", "");
      queryConditions.$or = [
        { country_name: new RegExp(countryOrStateName, "i") },
        { state_name: new RegExp(countryOrStateName, "i") },
      ];
    }

    // Execute the database query
    data = await Cities.find(queryConditions).limit(20);

    if (data.length === 0) {
      return res.status(404).json({ message: "City not found" });
    }

    // Return the response
    res.json(
      data.map((city) => ({
        id: city.id,
        name: `${city.name}, ${city.state_name}, ${city.country_name}`,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const searchUniversities = async (req, res) => {
  const uniName = req.query.name;

  try {
    const regex = new RegExp(`^${uniName}`, "i");
    const data = await Education.find({ name: { $regex: regex } }).limit(20);
    if (data.length === 0) {
      return res.status(404).json({ message: "University not found" });
    }

    res.json(
      data.map((uni) => ({ id: uni.id, name: uni.name, country: uni.country }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const searchCompanies = async (req, res) => {
  const compName = req.query.name;

  try {
    const regex = new RegExp(`^${compName}`, "i");
    const data = await Company.find({ name: { $regex: regex } }).limit(20);
    if (data.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(
      data.map((comp) => ({
        id: comp.id,
        name: comp.name,
        country: comp.country,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const searchJobTitles = async (req, res) => {
  const job = req.query.name;

  try {
    const regex = new RegExp(`^${job}`, "i");
    const data = await JobTitle.find({ name: { $regex: regex } }).limit(20);
    if (data.length === 0) {
      return res.status(404).json({ message: "Job Title not found" });
    }

    res.json(
      data.map((comp) => ({
        id: comp.id,
        name: comp.name,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const searchDegreesAndFields = async (req, res) => {
  const key = req.query.name;
  const type = req.query.type;

  try {
    const regex = new RegExp(`^${key}`, "i");
    const data = await DegreeAndFieldOfStudy.find({
      name: { $regex: regex },
      type: type,
    }).limit(20);
    if (data.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(
      data.map((comp) => ({
        id: comp.id,
        name: comp.name,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  easySearch,
  searchBookmarks,
  searchHiddenQuest,
  searchCities,
  searchUniversities,
  searchCompanies,
  searchJobTitles,
  searchDegreesAndFields,
};
