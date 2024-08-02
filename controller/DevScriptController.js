const User = require("../models/UserModel");
const { UserListSchema, CategorySchema, PostSchema } = require("../models/UserList");
const { MONGO_URI_MAIN, MONGO_URI_STAG, MONGO_URI_DEV } = require("../config/env");
const { MongoClient } = require('mongodb');
const { uploadS3Bucket } = require('../utils/uploadS3Bucket');
const UserQuestSetting = require('../models/UserQuestSetting');
const StartQuests = require('../models/StartQuests');
const InfoQuestQuestions = require('../models/InfoQuestQuestions');
const Ledgers = require('../models/Ledgers');


// const excep = async (req, res) => {
//   try {
//     const users = await User.find({});
//     const bulkOps = [];

//     users.forEach(user => {
//       let updated = false;

//       // Iterate over each badge in the user's badges array
//       user.badges.forEach(badge => {
//         // Check if the badge type is within the specified types and details field doesn't exist
//         if (badge.type && badge.isVerified && !["desktop", "mobile", "farcaster"].includes(badge.type)) {
//           // Check and add missing fields with default values
//           if (!badge.accountId || badge.accountId === undefined || badge.accountId === null) {
//             badge.accountId = "";
//             updated = true;
//           }
//           if (!badge.accountName || badge.accountName === undefined || badge.accountName === null) {
//             badge.accountName = "";
//             updated = true;
//           }
//           if (!badge.details || badge.details === undefined || badge.details === null) {
//             badge.details = { value: null};
//             updated = true;
//           }
//         }
//       });

//       // If any badge was updated, add the update operation to bulkOps
//       if (updated) {
//         bulkOps.push({
//           updateOne: {
//             filter: { _id: user._id },
//             update: { $set: { badges: user.badges } }
//           }
//         });
//       }
//     });

//     if (bulkOps.length > 0) {
//       const bulkWriteResult = await User.bulkWrite(bulkOps);
//       res.status(200).send({
//         message: `${bulkWriteResult.matchedCount} documents matched the filter, ${bulkWriteResult.modifiedCount} documents were updated.`
//       });
//     } else {
//       res.status(200).send({ message: 'No users to update.' });
//     }
//   } catch (error) {
//     res.status(500).send({ message: error.message });
//   }
// };

// const encryptBadgeData = async (req, res) => {
//   try {
//     const users = await User.find({});

//     const bulkOps = users
//       .map(user => {
//         if(user.badges.length !== 0) {
//           //console.log("user================>", user);
//           user.badges.forEach(badge => {
//             if (badge.type && badge.type === "cell-phone") {
//               badge.details = encryptData(badge.details);
//             } else if (badge.type && ["work", "education", "personal", "social", "default"].includes(badge.type)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.details = encryptData(badge.details);
//             } else if (badge.accountName && ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"].includes(badge.accountName)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.details = encryptData(badge.details);
//             } else if (badge.personal && badge.personal.work) {
//               badge.personal.work = badge.personal.work.map(encryptData);
//             } else if (badge.personal) {
//               badge.personal = encryptData(badge.personal);
//             } else if (badge.web3) {
//               badge.web3 = encryptData(badge.web3);
//             } else if (badge.type && ["desktop", "mobile", "farcaster"].includes(badge.type)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.data = encryptData(badge.data);
//             }
//           });

//           return {
//             updateOne: {
//               filter: { _id: user._id },
//               update: { $set: { badges: user.badges } }
//             }
//           };
//         }
//         return null;
//       })
//       .filter(op => op !== null);  // Filter out any null values

//     if (bulkOps.length > 0) {
//       const bulkWriteResult = await User.bulkWrite(bulkOps);
//       res.status(200).send({ message: `${bulkWriteResult.matchedCount} documents matched the filter, ${bulkWriteResult.modifiedCount} documents were updated.`});
//     } else {
//       res.status(200).send({ message: "No documents to update." });
//     }
//   } catch (error) {
//     res.status(500).send({message: error.message});
//   }
// };

const createUserListForAllUsers = async (req, res) => {
    try {
        // Fetch all users from the users collection
        const users = await User.find({});

        // Array to store promises for creating userlists
        const userListPromises = [];

        // Iterate over each user
        for (const user of users) {
            // Check if a userList already exists for the user
            const existingUserList = await UserListSchema.findOne({ userUuid: user.uuid });

            // If userList does not exist for the user, create one
            if (!existingUserList) {
                const userList = new UserListSchema({
                    userUuid: user.uuid,
                    // Other fields will default as per the schema
                });

                // Save the userList and push the promise to the array
                userListPromises.push(userList.save());
            }
        }

        // Wait for all userlist documents to be created
        const result = await Promise.all(userListPromises);

        // Send success response
        res.status(200).json({
            message: 'UserList Collection is Refactored successfully',
            userList: result,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while creating the userList: ${error.message}`,
        });
    }
}

const resetDatabase = async (dbURL) => {
    const client = new MongoClient(dbURL, { useNewUrlParser: true, useUnifiedTopology: true });
    const excludedCollections = [
        'cities',
        'companies',
        'degreesandfields',
        'educations',
        'jobtitles',
        'questtopics',
        'treasuries'
    ];

    try {
        await client.connect();
        const db = client.db();
        const collections = await db.collections();

        // Drop collections not in the excluded list
        for (let collection of collections) {
            if (!excludedCollections.includes(collection.collectionName)) {
                await collection.drop();
            }
        }

        // Update the 'amount' field in the 'treasuries' collection
        const treasuriesCollection = db.collection('treasuries');
        await treasuriesCollection.updateOne({}, { $set: { amount: 10000000 } });

    } catch (error) {
        console.error(`Error resetting database at ${dbURL}: ${error.message}`);
        throw error;
    } finally {
        await client.close();
    }
};

const resetMainDatabase = async () => {
    try {
        // const mainURL = MONGO_URI_MAIN;
        // await resetDatabase(mainURL);
        const localURL = "mongodb://0.0.0.0:27017/localDBName";
        await resetDatabase(localURL);
    } catch (error) {
        console.error(`Error resetting main database: ${error.message}`);
        throw new Error(`Error resetting main database: ${error.message}`);
    }
};

const resetStagingDatabase = async () => {
    try {
        // const stagURL = MONGO_URI_STAG;
        // await resetDatabase(stagURL);
        const localURL = "mongodb://0.0.0.0:27017/localDBName";
        await resetDatabase(localURL);
    } catch (error) {
        console.error(`Error resetting staging database: ${error.message}`);
        throw new Error(`Error resetting staging database: ${error.message}`);
    }
};

const resetDevelopmentDatabase = async () => {
    try {
        // const devURL = MONGO_URI_DEV;
        // await resetDatabase(devURL);
        const localURL = "mongodb://0.0.0.0:27017/localDBName";
        await resetDatabase(localURL);
    } catch (error) {
        console.error(`Error resetting development database: ${error.message}`);
        throw new Error(`Error resetting development database: ${error.message}`);
    }
};

const dbReset = async (req, res) => {
    try {
        const { db } = req.body;  // Assuming db is coming from the request body
        const validDbs = ["main", "stag", "dev"];

        if (!validDbs.includes(db)) {
            return res.status(404).json({ message: `DB ${db} does not exist` });
        }

        switch (db) {
            case "main":
                // Logic for resetting the main database
                await resetMainDatabase();
                break;
            case "stag":
                // Logic for resetting the staging database
                await resetStagingDatabase();
                break;
            case "dev":
                // Logic for resetting the development database
                await resetDevelopmentDatabase();
                break;
            default:
                return res.status(404).json({ message: `DB ${db} does not exist` });
        }

        res.status(200).json({ message: `Database ${db} reset successfully` });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred: ${error.message}`,
        });
    }
};

const userListSeoSetting = async (req, res) => {
    try {
        // Aggregation pipeline
        const pipeline = [
            { $unwind: "$list" },
            { $match: { "list.link": { $ne: null } } },
            {
                $project: {
                    link: "$list.link",
                    // Add any other necessary fields you need to project
                }
            }
        ];

        // Run the aggregation
        const result = await UserListSchema.aggregate(pipeline);

        // Iterate through the result and call uploadS3Bucket for each category
        for (const doc of result) {
            await uploadS3Bucket({
                fileName: doc.link,
                description: "A revolutionary new social platform. Own your data. Get rewarded.",
                route: "static_pages/list",
                title: "Foundation: Shared list",
            });
        }

        // Send success response
        res.status(200).json({
            message: 'SEO Created',
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while creating the userList: ${error.message}`,
        });
    }
};

const userPostSeoSetting = async (req, res) => {
    try {

        const result = await UserQuestSetting.find({
            link: { $ne: "" }
        }).lean();

        // Iterate through the result and call uploadS3Bucket for each category
        for (const doc of result) {
            await uploadS3Bucket({
                fileName: doc.link,
                description: doc.Question,
                route: "static_pages",
                title: "Foundation",
            });
        }

        // Send success response
        res.status(200).json({
            message: 'SEO Created',
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while creating the userList: ${error.message}`,
        });
    }
};

const setFeedback = async (req, res) => {
    try {
        const hiddenQuests = await UserQuestSetting.find({ hidden: true });

        for (const quest of hiddenQuests) {
            let updated = false;
            if (quest.feedbackTime == null || !quest.feedbackTime) {
                quest.feedbackTime = quest.hiddenTime;
                updated = true;
            }
            if (quest.feedbackMessage === '' || !quest.feedbackMessage) {
                quest.feedbackMessage = quest.hiddenMessage;
                updated = true;
            }
            if (updated) {
                await quest.save();
                const startQuestExist = await StartQuests.findOne(
                    {
                        uuid: quest.uuid,
                        questForeignKey: quest.questForeignKey,
                    }
                )
                if (!startQuestExist) {
                    const startQuestModel = new StartQuests({
                        addedAnswer: "",
                        addedAnswerUuid: "",
                        data: [],
                        isAddedAnsSelected: "",
                        questForeignKey: quest.questForeignKey,
                        uuid: quest.uuid,
                        isFeedback: true
                    })
                    await startQuestModel.save();
                } else {
                    startQuestExist.isFeedback = true;
                    await startQuestExist.save();
                }
            }

            if (quest.hiddenMessage === "Historical / Past Event" && !quest.historyDate) {
                quest.historyDate = null;
                await quest.save();
            } else if (quest.hiddenMessage === "Historical / Past Event" && quest.historyDate !== null) {
                const sameDate = await UserQuestSetting.findOne({
                    _id: { $ne: quest._id },
                    hidden: true,
                    historyDate: quest.historyDate
                });
                if (sameDate) {
                    await InfoQuestQuestions.findOneAndUpdate(
                        {
                            _id: quest.questForeignKey
                        },
                        {
                            isClosed: true
                        }
                    ).exec();
                }
            }

            if (quest.hiddenMessage === "Needs More Options") {
                const questAlreadyExist = await UserQuestSetting.findOne({
                    _id: { $ne: quest._id },
                    hidden: true,
                    hiddenMessage: "Needs More Options"
                });
                if (questAlreadyExist) {
                    await InfoQuestQuestions.findOneAndUpdate(
                        {
                            _id: quest.questForeignKey
                        },
                        {
                            usersAddTheirAns: true,
                            isAddOptionFeedback: true,
                        }
                    ).exec();
                }
            }
        }

        res.status(200).json({
            message: 'Feedback updated successfully for hidden quests',
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while updating the feedback: ${error.message}`,
        });
    }
};

const setPostCounters = async (req, res) => {
    try {

        const submitDocs = await Ledgers.find(
            {
                txUserAction: "postCompleted",
                txAuth: "User",
            }
        )

        for (const doc of submitDocs) {
            await InfoQuestQuestions.findByIdAndUpdate(
                {
                    _id: doc.txData
                },
                {
                    $inc: { submitCounter: 1 }
                }
            )
        }

        // Step 1: Aggregate to collect questForeignKeys from StartQuests based on Ledgers
        const questForeignKeys = await Ledgers.aggregate([
            {
                $match: {
                    txUserAction: "postCompletedChange",
                    txAuth: "User"
                }
            },
            {
                $lookup: {
                    from: 'startquests', // Ensure this matches your StartQuests collection name
                    localField: 'txData',
                    foreignField: '_id',
                    as: 'startQuestDocs'
                }
            },
            {
                $unwind: '$startQuestDocs'
            },
            {
                $project: {
                    _id: 0,
                    questForeignKey: '$startQuestDocs.questForeignKey'
                }
            }
        ]);

        // Extract questForeignKeys
        const foreignKeys = questForeignKeys.map(doc => doc.questForeignKey);

        // Step 2: Update InfoQuestQuestions
        const results = await InfoQuestQuestions.updateMany(
            { _id: { $in: foreignKeys } },
            { $inc: { changeCounter: 1 } }
        );

        res.status(200).json({
            message: 'Counters are updated',
            data: results
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while updating the feedback: ${error.message}`,
        });
    }
};

module.exports = {
    createUserListForAllUsers,
    dbReset,
    userListSeoSetting,
    userPostSeoSetting,
    setFeedback,
    setPostCounters,
};