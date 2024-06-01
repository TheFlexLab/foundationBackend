const QuestTopics = require("../models/QuestTopics");

const update = async (req, res) => {
  try {
    const { topicId: id, isAllow } = req.params;
    const Topic = await QuestTopics.findByPk(id);
    if (!Topic) throw new Error("No such Topic!");
    Topic.isAllow = isAllow;
    await Topic.save();
    res.status(200).json({ data: Topic });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while update QuestTopic: ${error.message}`,
    });
  }
};

// const getAllTopic = async (req, res) => {
//   try {
//     const { page, limit, uuid } = req.query;
//     const skip = (page - 1) * limit;

//     const questTopics = await QuestTopics.find()
//       .sort({ _id: 1 }) // Adjust the sorting based on your needs
//       .skip(skip)
//       .limit(parseInt(limit));

//     const namesArray = questTopics.map((topic) => topic.name);

//     const totalCount = await QuestTopics.countDocuments({ uuid });
//     const pageCount = Math.ceil(totalCount / limit);

//     //console.log(questTopics);

//     res.status(200).json({
//       // data: questTopics,
//       data: namesArray,
//       pageCount,
//       totalCount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: `An error occurred while getAll QuestTopic: ${error.message}`,
//     });
//   }
// };
const getAllTopic = async (req, res) => {
  try {
    // const { page, limit, uuid } = req.query;
    // const skip = (page - 1) * limit;

    // const questTopics = await QuestTopics.find()
    //   .sort({ _id: 1 }) // Adjust the sorting based on your needs
    //   .skip(skip)
    //   .limit(parseInt(limit));

    // const namesArray = questTopics.map((topic) => topic.name);

    // const totalCount = await QuestTopics.countDocuments({ uuid });
    // const pageCount = Math.ceil(totalCount / limit);

    // //console.log(questTopics);
    const masterArr = [
      "Architecture",
      "Arts",
      "Business",
      "Culture",
      "Economics",
      "Education",
      "Entertainment",
      "Environment",
      "Ethics",
      "Finance",
      "Fitness",
      "Food",
      "Geography",
      "Health",
      "History",
      "Hobbies",
      "Home",
      "Law",
      "Media",
      "Music",
      "Parenting",
      "Pets",
      "Philosophy",
      "Personal",
      "Politics",
      "Preferences",
      "Psychology",
      "Religion",
      "Science",
      "Society",
      "Sports",
      "Technology",
      "Other",
    ];

    res.status(200).json({
      // data: questTopics,
      data: masterArr,
      // pageCount,
      // totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getAll QuestTopic: ${error.message}`,
    });
  }
};

const searchTopics = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const query = {
      name: { $regex: new RegExp(search, "i") }, // Case-insensitive search
    };

    const questTopics = await QuestTopics.find(query).sort({ _id: 1 }); // Adjust sorting based on your needs

    const namesArray = questTopics.map((topic) => topic.name);

    const totalCount = questTopics.length;

    res.status(200).json({
      data: namesArray,
      totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while searching topics: ${error.message}`,
    });
  }
};

const getAllQuestByTopic = async (req, res) => {
  try {
    const { title } = req.body;
    const existingTopic = await Topic.findOne({ title });

    if (existingTopic) {
      // If the topic exists, increment the count
      existingTopic.count++;
      await existingTopic.save();
      res.json(existingTopic);
    } else {
      // If the topic doesn't exist, create a new one
      const newTopic = new Topic({ title });
      await newTopic.save();
      res.json(newTopic);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllQuestByTopic QuestTopic: ${error.message}`,
    });
  }
};

const getAllQuestByTrendingTopic = async (req, res) => {
  try {
    // Get the top trending topics (you can customize the logic based on your requirements)
    const trendingTopics = await Topic.find().sort({ count: -1 }).limit(10);
    res.json(trendingTopics);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllQuestByTrendingTopic QuestTopic: ${error.message}`,
    });
  }
};

module.exports = {
  update,
  getAllTopic,
  getAllQuestByTopic,
  getAllQuestByTrendingTopic,
  searchTopics,
};
