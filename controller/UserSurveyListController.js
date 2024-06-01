const User = require("../models/UserModel");
const { UserListSchema, CategorySchema, PostSchema, } = require("../models/UserList");
const BookmarkQuestsSchema = require("../models/BookmarkQuests");
const { getQuestByIdQuestForeignKey } = require("../controller/InfoQuestQuestionController");
const { PostDataSchema, ResponseDataSchema, } = require("../models/PostData");
const shortLink = require("shortlink");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const StartQuests = require("../models/StartQuests");
const { createLedger } = require("../utils/createLedger");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices")
const crypto = require("crypto");
const mongoose = require("mongoose");

// User's List APIs

const userList = async (req, res) => {
    try {

        const userUuid = req.params.userUuid;
        const categoryName = req.query.categoryName;

        if (categoryName) {
            const userList = await UserListSchema.findOne({ userUuid: userUuid })
                .populate({
                    path: 'list.post.questForeginKey',
                    model: 'InfoQuestQuestions'
                });
            if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

            // Find all categories within the list array that contain categoryName substring
            const categories = userList.list.filter(obj => {
                const regex = new RegExp(categoryName, 'i'); // 'i' flag for case-insensitive match
                return regex.test(obj.category);
            });

            if (categories.length === 0) {
                res.status(200).json({
                    message: "No Category found.",
                    userList: [],
                });
            }
            else {
                res.status(200).json({
                    message: `Categories found successfully`,
                    userList: categories,
                });
            }

        } else {
            const userList = await UserListSchema.findOne({ userUuid: userUuid })
                .populate({
                    path: 'list.post.questForeginKey',
                    model: 'InfoQuestQuestions'
                });
            if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

            // Create a deep copy of the userList object to sort and return without saving
            const sortedUserList = JSON.parse(JSON.stringify(userList));

            // Iterate over each category in the list array and sort the post array by order
            sortedUserList.list.forEach(category => {
                category.post.sort((a, b) => a.order - b.order);
            });

            res.status(200).json({
                message: 'List found successfully.',
                userList: sortedUserList.list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const addCategoryInUserList = async (req, res) => {
    try {
        const { userUuid, category } = req.body;

        const userList = await UserListSchema.findOne({
            userUuid: userUuid
        })
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Check if userList already has a category with the same name
        const categoryExists = userList.list.some(obj => obj.category === category);
        if (categoryExists) throw new Error(`Category: ${category}, Already exists in the user list.`);

        const newCategory = new CategorySchema({
            category: category,
        });
        userList.list.push(newCategory)

        userList.updatedAt = new Date().toISOString();
        await userList.save();

        const populatedUserList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });

        res.status(200).json({
            message: "New category is created successfully.",
            userList: populatedUserList.list,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const findCategoryById = async (req, res) => {
    try {

        const { userUuid, categoryId } = req.params;

        const userList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Find the category within the list array based on categoryId
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        res.status(200).json({
            message: `Category found successfully`,
            userList: categoryDoc,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const findCategoryByName = async (req, res) => {
    try {

        const { userUuid, categoryName } = req.params;

        const userList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Find all categories within the list array that contain categoryName substring
        const categories = userList.list.filter(obj => {
            const regex = new RegExp(categoryName, 'i'); // 'i' flag for case-insensitive match
            return regex.test(obj.category);
        });

        if (categories.length === 0) throw new Error('No categories found');

        res.status(200).json({
            message: `Categories found successfully`,
            categories: categories,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const updateCategoryInUserList = async (req, res) => {
    try {

        const { userUuid, categoryId } = req.params;
        const postId = req.query.postId;
        const category = req.body.category;

        if (!postId && !category || postId && category) throw new Error("Bad Request: Please Provide either category in your request, or postId in query");

        // Find UserList Document
        const userList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Find the document in the list array by categoryId
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        // Delete Post Or Update Category Only.
        if (postId) categoryDoc.post.pull({ _id: postId });
        if (category) {
            // Check if userList already has a category with the same name
            const categoryExists = userList.list.some(obj => obj.category === category);
            if (categoryExists) throw new Error(`Category: ${category}, Already exists in the user list.`);
            categoryDoc.category = category;
        }

        categoryDoc.updatedAt = new Date().toISOString();
        userList.updatedAt = new Date().toISOString();
        // Save the updated userList document
        await userList.save();

        res.status(200).json({
            message: `Category found successfully`,
            userList: categoryDoc,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const deleteCategoryFromList = async (req, res) => {
    try {
        const { userUuid, categoryId } = req.params;

        // Find UserList Document
        const userList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        userList.list.pull({ _id: categoryId });
        userList.updatedAt = new Date().toISOString();
        // Save the updated userList document
        await userList.save();

        res.status(200).json({
            message: "New category is created successfully.",
            userList: userList.list,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: `An error occurred: ${error.message}` });
    }
};

const generateCategoryShareLink = async (req, res) => {
    try {

        const { userUuid, categoryId } = req.params;
        const customizedLink = req.query.customizedLink;

        // Check if customizedLink contains any spaces or periods
        if (customizedLink && /[\s.]/.test(customizedLink)) throw new Error('Customized link should not contain spaces or periods');

        const userList = await UserListSchema.findOne({ userUuid: userUuid })
        // .populate({
        //     path: 'list.post.questForeginKey',
        //     model: 'InfoQuestQuestions'
        // });
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Find the category within the list array based on categoryId
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        if (customizedLink && categoryDoc.isLinkUserCustomized) throw new Error("Link can be customized only once.")

        if (categoryDoc.link === null || !categoryDoc.isLinkUserCustomized) {
            if (customizedLink) {
                categoryDoc.link = customizedLink;
                categoryDoc.isLinkUserCustomized = true;
                await createLedger({
                    uuid: userUuid,
                    txUserAction: "listLinkCreatedCustom",
                    txID: crypto.randomBytes(11).toString("hex"),
                    txAuth: "User",
                    txFrom: userUuid,
                    txTo: "dao",
                    txAmount: 2.5,
                    txData: userUuid,
                    txDate: Date.now(),
                    txDescription: "List Link Customized",
                });
                // Create Ledger
                await createLedger({
                    uuid: userUuid,
                    txUserAction: "listLinkCreatedCustom",
                    txID: crypto.randomBytes(11).toString("hex"),
                    txAuth: "DAO",
                    txFrom: "DAO Treasury",
                    txTo: userUuid,
                    txAmount: 0,
                    txDate: Date.now(),
                    txDescription: "List Link Customized",
                });
                // Increment the Treasury
                await updateTreasury({
                    amount: 2.5,
                    inc: true,
                });
                // Decrement the UserBalance
                await updateUserBalance({
                    uuid: userUuid,
                    amount: 2.5,
                    dec: true,
                });
            }
            else {
                categoryDoc.link = shortLink.generate(8);
                await createLedger({
                    uuid: userUuid,
                    txUserAction: "listLinkCreated",
                    txID: crypto.randomBytes(11).toString("hex"),
                    txAuth: "User",
                    txFrom: userUuid,
                    txTo: "dao",
                    txAmount: "0",
                    txData: userUuid,
                    // txDescription : "User changes password"
                });
            }

            categoryDoc.updatedAt = new Date().toISOString();
            userList.updatedAt = new Date().toISOString();
            await userList.save();
        }

        res.status(200).json({
            message: `Here is Share Link for ${categoryDoc.category}.`,
            link: categoryDoc.link,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const findCategoryByLink = async (req, res) => {
    try {

        const { categoryLink } = req.params;
        const { uuid } = req.query;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            'list.link': categoryLink
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });

        if (!userList) throw new Error(`No list is found with the category link: ${categoryLink}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.find(obj => obj.link === categoryLink);
        if (!categoryDoc) throw new Error('Category not found');

        if (uuid) {
            let updatedPosts = [];

            for (const post of categoryDoc.post) {
                const postId = new mongoose.Types.ObjectId(post._id.toString());
                // Find the postData document
                const bookmark = await BookmarkQuestsSchema.findOne({
                    questForeignKey: post.questForeginKey.toString(),
                    createdBy: uuid
                })
                const user = await User.findOne({ uuid: userList.userUuid });

                const postData = await PostDataSchema.findOne({ postId: postId });
                if (!postData) {

                    const questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                    // Add the updated post to the array
                    updatedPosts.push({
                        ...post.toObject(), // Convert Mongoose document to plain JS object
                        questForeginKey: questForeginKeyWithStartQuestData
                    });

                }
                else {
                    const responseDataDoc = postData.responseData.find(item => item.responsingUserUuid === uuid);
                    if (!responseDataDoc) {
                        const questForeginKeyWithStartQuestData = {
                            ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                            bookmark: bookmark ? true : false,
                            getUserBadge: {
                                _id: user._id,
                                badges: user.badges,
                            },
                        };
                        // Add the updated post to the array
                        updatedPosts.push({
                            ...post.toObject(), // Convert Mongoose document to plain JS object
                            questForeginKey: questForeginKeyWithStartQuestData
                        });
                    }
                    else {
                        const responseDataStats = await PostDataSchema.aggregate([
                            {
                                $match: { postId: postId }
                            },
                            {
                                $unwind: '$responseData'
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalCount: { $sum: 1 },
                                    yesCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'Yes'] }, 1, 0]
                                        }
                                    },
                                    noCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'No'] }, 1, 0]
                                        }
                                    },
                                    agreeCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'Agree'] }, 1, 0]
                                        }
                                    },
                                    disagreeCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'Disagree'] }, 1, 0]
                                        }
                                    },
                                    likeCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'Like'] }, 1, 0]
                                        }
                                    },
                                    dislikeCount: {
                                        $sum: {
                                            $cond: [{ $eq: ['$responseData.response.selected', 'Dislike'] }, 1, 0]
                                        }
                                    },
                                    multipleChoiceResponses: {
                                        $push: '$responseData.response.selected'
                                    }
                                }
                            },
                            {
                                $unwind: {
                                    path: '$multipleChoiceResponses',
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $unwind: {
                                    path: '$multipleChoiceResponses',
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        question: '$multipleChoiceResponses.question'
                                    },
                                    questionCount: { $sum: 1 },
                                    totalMultipleChoiceCount: { $sum: 1 },  // Total count for this specific group
                                    totalCount: { $first: '$totalCount' },
                                    yesCount: { $first: '$yesCount' },
                                    noCount: { $first: '$noCount' },
                                    agreeCount: { $first: '$agreeCount' },
                                    disagreeCount: { $first: '$disagreeCount' },
                                    likeCount: { $first: '$likeCount' },
                                    dislikeCount: { $first: '$dislikeCount' }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalCount: { $first: '$totalCount' },
                                    yesCount: { $first: '$yesCount' },
                                    noCount: { $first: '$noCount' },
                                    agreeCount: { $first: '$agreeCount' },
                                    disagreeCount: { $first: '$disagreeCount' },
                                    likeCount: { $first: '$likeCount' },
                                    dislikeCount: { $first: '$dislikeCount' },
                                    totalMultipleChoiceCount: { $sum: '$totalMultipleChoiceCount' },  // Sum of all multiple choice counts
                                    questions: {
                                        $push: {
                                            question: '$_id.question',
                                            count: '$questionCount'
                                        }
                                    }
                                }
                            },
                            {
                                $addFields: {
                                    questions: {
                                        $map: {
                                            input: '$questions',
                                            as: 'question',
                                            in: {
                                                question: '$$question.question',
                                                count: '$$question.count',
                                                percentage: { $multiply: [{ $divide: ['$$question.count', '$totalMultipleChoiceCount'] }, 100] }  // Calculate percentage correctly
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    yesNo: {
                                        $cond: {
                                            if: { $gt: [{ $add: ['$yesCount', '$noCount'] }, 0] },
                                            then: {
                                                Yes: '$yesCount',
                                                YesPercentage: { $multiply: [{ $divide: ['$yesCount', '$totalCount'] }, 100] },
                                                No: '$noCount',
                                                NoPercentage: { $multiply: [{ $divide: ['$noCount', '$totalCount'] }, 100] }
                                            },
                                            else: '$$REMOVE'
                                        }
                                    },
                                    agreeDisagree: {
                                        $cond: {
                                            if: { $gt: [{ $add: ['$agreeCount', '$disagreeCount'] }, 0] },
                                            then: {
                                                Agree: '$agreeCount',
                                                AgreePercentage: { $multiply: [{ $divide: ['$agreeCount', '$totalCount'] }, 100] },
                                                Disagree: '$disagreeCount',
                                                DisagreePercentage: { $multiply: [{ $divide: ['$disagreeCount', '$totalCount'] }, 100] }
                                            },
                                            else: '$$REMOVE'
                                        }
                                    },
                                    likeDislike: {
                                        $cond: {
                                            if: { $gt: [{ $add: ['$likeCount', '$dislikeCount'] }, 0] },
                                            then: {
                                                Like: '$likeCount',
                                                LikePercentage: { $multiply: [{ $divide: ['$likeCount', '$totalCount'] }, 100] },
                                                Dislike: '$dislikeCount',
                                                DislikePercentage: { $multiply: [{ $divide: ['$dislikeCount', '$totalCount'] }, 100] }
                                            },
                                            else: '$$REMOVE'
                                        }
                                    },
                                    multipleChoice: {
                                        $cond: {
                                            if: { $gt: [{ $size: '$questions' }, 0] },
                                            then: '$questions',
                                            else: '$$REMOVE'
                                        }
                                    }
                                }
                            }
                        ]);
                        let questForeginKeyWithStartQuestData;

                        const isPostRankedChoice = await InfoQuestQuestions.findOne({ _id: new mongoose.Types.ObjectId((post.questForeginKey._id).toString()) })
                        if (isPostRankedChoice.whichTypeQuestion === "ranked choise") {
                            // continue;
                            const choices = isPostRankedChoice.QuestAnswers.map(answer => answer.question);

                            // Initialize a ranks object to store the rank totals for each choice
                            const ranks = {};

                            // Initialize the ranks object with each choice
                            choices.forEach(choice => {
                                ranks[choice] = 0;
                            });

                            // Iterate through each user's response in the responseData array
                            postData.responseData.forEach(responseDoc => {
                                const response = responseDoc.response;
                                if (response && Array.isArray(response.selected)) {
                                    response.selected.forEach((selectedItem, index) => {
                                        const choice = selectedItem.question;
                                        if (ranks.hasOwnProperty(choice)) {
                                            // Add the rank (index) to the total rank for this choice
                                            ranks[choice] += index + 1;  // Adding 1 because index is 0-based
                                        }
                                    });
                                }
                            });

                            // Sort ranks by total rank values
                            const sortedRanks = Object.entries(ranks).sort((a, b) => a[1] - b[1]);
                            const data = {
                                ...responseDataDoc.response,
                                contended: []
                            }

                            // Calculate the total rank sum
                            const totalRanksSum = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);

                            // Calculate the inverted percentages
                            const invertedPercentages = {};
                            choices.forEach(choice => {
                                const choiceRank = ranks[choice];
                                // Calculate the inverted rank sum as the difference between the total rank sum and the choice's rank sum
                                const invertedRank = totalRanksSum - choiceRank;
                                invertedPercentages[choice] = (invertedRank / (totalRanksSum * (choices.length - 1))) * 100;
                            });

                            // Transform inverted percentages to formatted strings
                            const formattedPercentages = {};
                            Object.entries(invertedPercentages).forEach(([choice, percentage]) => {
                                formattedPercentages[choice] = `${Math.round(percentage)}%`;
                            });

                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [data],
                                    questForeignKey: post.questForeginKey._id,
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                startStatus: responseDataDoc.startStatus,
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                                result: [
                                    {
                                        selected: ranks
                                    }
                                ],
                                selectedPercentage: [
                                    formattedPercentages
                                ],
                            };
                        }
                        else if (responseDataStats[0].yesNo) {
                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startStatus: responseDataDoc.startStatus,
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [responseDataDoc.response],
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                result: [
                                    {
                                        selected: {
                                            Yes: responseDataStats[0].yesNo.Yes,
                                            No: responseDataStats[0].yesNo.No,
                                        }
                                    }
                                ],
                                selectedPercentage: [
                                    {
                                        Yes: (Math.round(responseDataStats[0].yesNo.YesPercentage)).toString() + "%",
                                        No: (Math.round(responseDataStats[0].yesNo.NoPercentage)).toString() + "%",
                                    }
                                ],
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                            };
                        }
                        else if (responseDataStats[0].agreeDisagree) {
                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startStatus: responseDataDoc.startStatus,
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [responseDataDoc.response],
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                result: [
                                    {
                                        selected: {
                                            Agree: responseDataStats[0].agreeDisagree.Agree,
                                            Disagree: responseDataStats[0].agreeDisagree.Disagree,
                                        }
                                    }
                                ],
                                selectedPercentage: [
                                    {
                                        Agree: (Math.round(responseDataStats[0].agreeDisagree.AgreePercentage)).toString() + "%",
                                        Disagree: (Math.round(responseDataStats[0].agreeDisagree.DisagreePercentage)).toString() + "%",
                                    }
                                ],
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                            };
                        }
                        else if (responseDataStats[0].likeDislike) {
                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startStatus: responseDataDoc.startStatus,
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [responseDataDoc.response],
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                result: [
                                    {
                                        selected: {
                                            Like: responseDataStats[0].likeDislike.Like,
                                            Dislike: responseDataStats[0].likeDislike.Dislike,
                                        }
                                    }
                                ],
                                selectedPercentage: [
                                    {
                                        Like: (Math.round(responseDataStats[0].likeDislike.LikePercentage)).toString() + "%",
                                        Dislike: (Math.round(responseDataStats[0].likeDislike.DislikePercentage)).toString() + "%",
                                    }
                                ],
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                            };
                        }
                        else if (responseDataStats[0].multipleChoice) {
                            let result = [{
                                selected: {}
                            }];
                            responseDataStats[0].multipleChoice.forEach(item => {
                                result[0].selected[item.question] = item.count;
                            });
                            let selectedPercentage = [{}];
                            // Iterate over the multipleChoice array and populate the object
                            responseDataStats[0].multipleChoice.forEach(item => {
                                selectedPercentage[0][item.question] = (Math.round(item.percentage)).toString() + "%";
                            });
                            const data = {
                                ...responseDataDoc.response,
                                contended: []
                            }
                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startStatus: responseDataDoc.startStatus,
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [data],
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                result: result,
                                selectedPercentage: selectedPercentage,
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                            };
                        }
                        else {
                            questForeginKeyWithStartQuestData = {
                                ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                                startQuestData: {
                                    uuid: responseDataDoc.responsingUserUuid,
                                    postId: postId,
                                    data: [responseDataDoc.response],
                                    addedAnswer: responseDataDoc.addedAnswer,
                                },
                                startStatus: responseDataDoc.startStatus,
                                bookmark: bookmark ? true : false,
                                getUserBadge: {
                                    _id: user._id,
                                    badges: user.badges,
                                },
                            };
                        }
                        // Add the updated post to the array
                        updatedPosts.push({
                            ...post.toObject(), // Convert Mongoose document to plain JS object
                            questForeginKey: questForeginKeyWithStartQuestData
                        });
                    }
                }
            }

            const newCategoryDoc = {
                category: categoryDoc.category,
                post: updatedPosts,
                link: categoryDoc.link,
                isLinkUserCustomized: categoryDoc.isLinkUserCustomized,
                clicks: categoryDoc.clicks,
                participents: categoryDoc.participents,
                createdAt: categoryDoc.createdAt,
                updatedAt: categoryDoc.updatedAt,
                deletedAt: categoryDoc.deletedAt,
                isActive: categoryDoc.isActive,
                _id: categoryDoc._id
            };

            res.status(200).json({
                message: `Category found successfully`,
                category: newCategoryDoc,
            });
        }
        else {

            res.status(200).json({
                message: `Category found successfully`,
                category: categoryDoc,
            });

        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const viewList = async (req, res) => {
    try {

        const { categoryId, userUuid } = req.params;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            userUuid: userUuid,
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });
        if (!userList) throw new Error(`No list is found with the category ID: ${categoryId}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        let updatedPosts = [];

        for (const post of categoryDoc.post) {
            const postId = new mongoose.Types.ObjectId(post._id.toString());
            // Find the postData document
            const bookmark = await BookmarkQuestsSchema.findOne({
                questForeignKey: post.questForeginKey.toString(),
                createdBy: userUuid
            })
            const user = await User.findOne({ uuid: userList.userUuid });

            const postData = await PostDataSchema.findOne({
                postId: postId
            })

            if (postData) {
                const responseDataStats = await PostDataSchema.aggregate([
                    {
                        $match: { postId: postId }
                    },
                    {
                        $unwind: '$responseData'
                    },
                    {
                        $group: {
                            _id: null,
                            totalCount: { $sum: 1 },
                            yesCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Yes'] }, 1, 0]
                                }
                            },
                            noCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'No'] }, 1, 0]
                                }
                            },
                            agreeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Agree'] }, 1, 0]
                                }
                            },
                            disagreeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Disagree'] }, 1, 0]
                                }
                            },
                            likeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Like'] }, 1, 0]
                                }
                            },
                            dislikeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Dislike'] }, 1, 0]
                                }
                            },
                            multipleChoiceResponses: {
                                $push: '$responseData.response.selected'
                            }
                        }
                    },
                    {
                        $unwind: {
                            path: '$multipleChoiceResponses',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$multipleChoiceResponses',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: {
                                question: '$multipleChoiceResponses.question'
                            },
                            questionCount: { $sum: 1 },
                            totalMultipleChoiceCount: { $sum: 1 },  // Total count for this specific group
                            totalCount: { $first: '$totalCount' },
                            yesCount: { $first: '$yesCount' },
                            noCount: { $first: '$noCount' },
                            agreeCount: { $first: '$agreeCount' },
                            disagreeCount: { $first: '$disagreeCount' },
                            likeCount: { $first: '$likeCount' },
                            dislikeCount: { $first: '$dislikeCount' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalCount: { $first: '$totalCount' },
                            yesCount: { $first: '$yesCount' },
                            noCount: { $first: '$noCount' },
                            agreeCount: { $first: '$agreeCount' },
                            disagreeCount: { $first: '$disagreeCount' },
                            likeCount: { $first: '$likeCount' },
                            dislikeCount: { $first: '$dislikeCount' },
                            totalMultipleChoiceCount: { $sum: '$totalMultipleChoiceCount' },  // Sum of all multiple choice counts
                            questions: {
                                $push: {
                                    question: '$_id.question',
                                    count: '$questionCount'
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            questions: {
                                $map: {
                                    input: '$questions',
                                    as: 'question',
                                    in: {
                                        question: '$$question.question',
                                        count: '$$question.count',
                                        percentage: { $multiply: [{ $divide: ['$$question.count', '$totalMultipleChoiceCount'] }, 100] }  // Calculate percentage correctly
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            yesNo: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$yesCount', '$noCount'] }, 0] },
                                    then: {
                                        Yes: '$yesCount',
                                        YesPercentage: { $multiply: [{ $divide: ['$yesCount', '$totalCount'] }, 100] },
                                        No: '$noCount',
                                        NoPercentage: { $multiply: [{ $divide: ['$noCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            agreeDisagree: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$agreeCount', '$disagreeCount'] }, 0] },
                                    then: {
                                        Agree: '$agreeCount',
                                        AgreePercentage: { $multiply: [{ $divide: ['$agreeCount', '$totalCount'] }, 100] },
                                        Disagree: '$disagreeCount',
                                        DisagreePercentage: { $multiply: [{ $divide: ['$disagreeCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            likeDislike: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$likeCount', '$dislikeCount'] }, 0] },
                                    then: {
                                        Like: '$likeCount',
                                        LikePercentage: { $multiply: [{ $divide: ['$likeCount', '$totalCount'] }, 100] },
                                        Dislike: '$dislikeCount',
                                        DislikePercentage: { $multiply: [{ $divide: ['$dislikeCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            multipleChoice: {
                                $cond: {
                                    if: { $gt: [{ $size: '$questions' }, 0] },
                                    then: '$questions',
                                    else: '$$REMOVE'
                                }
                            }
                        }
                    }
                ]);

                let questForeginKeyWithStartQuestData;

                const isPostRankedChoice = await InfoQuestQuestions.findOne({ _id: new mongoose.Types.ObjectId((post.questForeginKey._id).toString()) })
                if (isPostRankedChoice.whichTypeQuestion === "ranked choise") {
                    // continue;
                    const choices = isPostRankedChoice.QuestAnswers.map(answer => answer.question);

                    // Initialize a ranks object to store the rank totals for each choice
                    const ranks = {};

                    // Initialize the ranks object with each choice
                    choices.forEach(choice => {
                        ranks[choice] = 0;
                    });

                    // Iterate through each user's response in the responseData array
                    postData.responseData.forEach(responseDoc => {
                        const response = responseDoc.response;
                        if (response && Array.isArray(response.selected)) {
                            response.selected.forEach((selectedItem, index) => {
                                const choice = selectedItem.question;
                                if (ranks.hasOwnProperty(choice)) {
                                    // Add the rank (index) to the total rank for this choice
                                    ranks[choice] += index + 1;  // Adding 1 because index is 0-based
                                }
                            });
                        }
                    });

                    // Sort ranks by total rank values
                    const sortedRanks = Object.entries(ranks).sort((a, b) => a[1] - b[1]);
                    // const data = {
                    //     ...postData.responseData.response,
                    //     contended: []
                    // }

                    // Calculate the total rank sum
                    const totalRanksSum = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);

                    // Calculate the inverted percentages
                    const invertedPercentages = {};
                    choices.forEach(choice => {
                        const choiceRank = ranks[choice];
                        // Calculate the inverted rank sum as the difference between the total rank sum and the choice's rank sum
                        const invertedRank = totalRanksSum - choiceRank;
                        invertedPercentages[choice] = (invertedRank / (totalRanksSum * (choices.length - 1))) * 100;
                    });

                    // Transform inverted percentages to formatted strings
                    const formattedPercentages = {};
                    Object.entries(invertedPercentages).forEach(([choice, percentage]) => {
                        formattedPercentages[choice] = `${Math.round(percentage)}%`;
                    });

                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        // startQuestData: {
                        //     uuid: responseDataDoc.responsingUserUuid,
                        //     postId: postId,
                        //     data: [data],
                        //     questForeignKey: post.questForeginKey._id,
                        //     addedAnswer: responseDataDoc.addedAnswer,
                        // },
                        // startStatus: responseDataDoc.startStatus,
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                        result: [
                            {
                                selected: ranks
                            }
                        ],
                        selectedPercentage: [
                            formattedPercentages
                        ],
                    };
                }
                else if (responseDataStats[0].yesNo) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Yes: responseDataStats[0].yesNo.Yes,
                                    No: responseDataStats[0].yesNo.No,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Yes: (Math.round(responseDataStats[0].yesNo.YesPercentage)).toString() + "%",
                                No: (Math.round(responseDataStats[0].yesNo.NoPercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].agreeDisagree) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Agree: responseDataStats[0].agreeDisagree.Agree,
                                    Disagree: responseDataStats[0].agreeDisagree.Disagree,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Agree: (Math.round(responseDataStats[0].agreeDisagree.AgreePercentage)).toString() + "%",
                                Disagree: (Math.round(responseDataStats[0].agreeDisagree.DisagreePercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].likeDislike) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Like: responseDataStats[0].likeDislike.Like,
                                    Dislike: responseDataStats[0].likeDislike.Dislike,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Like: (Math.round(responseDataStats[0].likeDislike.LikePercentage)).toString() + "%",
                                Dislike: (Math.round(responseDataStats[0].likeDislike.DislikePercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].multipleChoice) {
                    let result = [{
                        selected: {}
                    }];
                    responseDataStats[0].multipleChoice.forEach(item => {
                        result[0].selected[item.question] = item.count;
                    });
                    let selectedPercentage = [{}];
                    // Iterate over the multipleChoice array and populate the object
                    responseDataStats[0].multipleChoice.forEach(item => {
                        selectedPercentage[0][item.question] = (Math.round(item.percentage)).toString() + "%";
                    });
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: result,
                        selectedPercentage: selectedPercentage,
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }

                // Add the updated post to the array
                updatedPosts.push({
                    ...post.toObject(), // Convert Mongoose document to plain JS object
                    questForeginKey: questForeginKeyWithStartQuestData
                });
            }
            else {
                const questForeginKeyWithStartQuestData = {
                    ...post.questForeginKey.toObject(),
                    bookmark: bookmark ? true : false,
                    getUserBadge: {
                        _id: user._id,
                        badges: user.badges,
                    },
                }
                updatedPosts.push({
                    ...post.toObject(),
                    questForeginKey: questForeginKeyWithStartQuestData
                })
            }

        }

        const newCategoryDoc = {
            category: categoryDoc.category,
            post: updatedPosts,
            link: categoryDoc.link,
            isLinkUserCustomized: categoryDoc.isLinkUserCustomized,
            clicks: categoryDoc.clicks,
            participents: categoryDoc.participents,
            createdAt: categoryDoc.createdAt,
            updatedAt: categoryDoc.updatedAt,
            deletedAt: categoryDoc.deletedAt,
            isActive: categoryDoc.isActive,
            _id: categoryDoc._id
        };

        res.status(200).json({
            message: `Category found successfully`,
            category: newCategoryDoc,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const viewListAll = async (req, res) => {
    try {

        const { categoryId, userUuid } = req.params;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            userUuid: userUuid,
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });
        if (!userList) throw new Error(`No list is found with the category ID: ${categoryId}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        let updatedPosts = [];

        for (const post of categoryDoc.post) {
            const postId = new mongoose.Types.ObjectId(post._id.toString());
            // Find the postData document
            const bookmark = await BookmarkQuestsSchema.findOne({
                questForeignKey: post.questForeginKey.toString(),
                createdBy: userUuid
            })
            const user = await User.findOne({ uuid: userList.userUuid });

            const postData = await PostDataSchema.findOne({
                postId: postId
            })
            let questForeginKeyWithStartQuestData;

            if (postData) {
                const responseDataStats = await PostDataSchema.aggregate([
                    {
                        $match: { postId: postId }
                    },
                    {
                        $unwind: '$responseData'
                    },
                    {
                        $group: {
                            _id: null,
                            totalCount: { $sum: 1 },
                            yesCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Yes'] }, 1, 0]
                                }
                            },
                            noCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'No'] }, 1, 0]
                                }
                            },
                            agreeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Agree'] }, 1, 0]
                                }
                            },
                            disagreeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Disagree'] }, 1, 0]
                                }
                            },
                            likeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Like'] }, 1, 0]
                                }
                            },
                            dislikeCount: {
                                $sum: {
                                    $cond: [{ $eq: ['$responseData.response.selected', 'Dislike'] }, 1, 0]
                                }
                            },
                            multipleChoiceResponses: {
                                $push: '$responseData.response.selected'
                            }
                        }
                    },
                    {
                        $unwind: {
                            path: '$multipleChoiceResponses',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$multipleChoiceResponses',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: {
                                question: '$multipleChoiceResponses.question'
                            },
                            questionCount: { $sum: 1 },
                            totalMultipleChoiceCount: { $sum: 1 },  // Total count for this specific group
                            totalCount: { $first: '$totalCount' },
                            yesCount: { $first: '$yesCount' },
                            noCount: { $first: '$noCount' },
                            agreeCount: { $first: '$agreeCount' },
                            disagreeCount: { $first: '$disagreeCount' },
                            likeCount: { $first: '$likeCount' },
                            dislikeCount: { $first: '$dislikeCount' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalCount: { $first: '$totalCount' },
                            yesCount: { $first: '$yesCount' },
                            noCount: { $first: '$noCount' },
                            agreeCount: { $first: '$agreeCount' },
                            disagreeCount: { $first: '$disagreeCount' },
                            likeCount: { $first: '$likeCount' },
                            dislikeCount: { $first: '$dislikeCount' },
                            totalMultipleChoiceCount: { $sum: '$totalMultipleChoiceCount' },  // Sum of all multiple choice counts
                            questions: {
                                $push: {
                                    question: '$_id.question',
                                    count: '$questionCount'
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            questions: {
                                $map: {
                                    input: '$questions',
                                    as: 'question',
                                    in: {
                                        question: '$$question.question',
                                        count: '$$question.count',
                                        percentage: { $multiply: [{ $divide: ['$$question.count', '$totalMultipleChoiceCount'] }, 100] }  // Calculate percentage correctly
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            yesNo: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$yesCount', '$noCount'] }, 0] },
                                    then: {
                                        Yes: '$yesCount',
                                        YesPercentage: { $multiply: [{ $divide: ['$yesCount', '$totalCount'] }, 100] },
                                        No: '$noCount',
                                        NoPercentage: { $multiply: [{ $divide: ['$noCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            agreeDisagree: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$agreeCount', '$disagreeCount'] }, 0] },
                                    then: {
                                        Agree: '$agreeCount',
                                        AgreePercentage: { $multiply: [{ $divide: ['$agreeCount', '$totalCount'] }, 100] },
                                        Disagree: '$disagreeCount',
                                        DisagreePercentage: { $multiply: [{ $divide: ['$disagreeCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            likeDislike: {
                                $cond: {
                                    if: { $gt: [{ $add: ['$likeCount', '$dislikeCount'] }, 0] },
                                    then: {
                                        Like: '$likeCount',
                                        LikePercentage: { $multiply: [{ $divide: ['$likeCount', '$totalCount'] }, 100] },
                                        Dislike: '$dislikeCount',
                                        DislikePercentage: { $multiply: [{ $divide: ['$dislikeCount', '$totalCount'] }, 100] }
                                    },
                                    else: '$$REMOVE'
                                }
                            },
                            multipleChoice: {
                                $cond: {
                                    if: { $gt: [{ $size: '$questions' }, 0] },
                                    then: '$questions',
                                    else: '$$REMOVE'
                                }
                            }
                        }
                    }
                ]);


                const isPostRankedChoice = await InfoQuestQuestions.findOne({ _id: new mongoose.Types.ObjectId((post.questForeginKey._id).toString()) })
                if (isPostRankedChoice.whichTypeQuestion === "ranked choise") {
                    // continue;
                    const choices = isPostRankedChoice.QuestAnswers.map(answer => answer.question);

                    // Initialize a ranks object to store the rank totals for each choice
                    const ranks = {};

                    // Initialize the ranks object with each choice
                    choices.forEach(choice => {
                        ranks[choice] = 0;
                    });

                    // Iterate through each user's response in the responseData array
                    postData.responseData.forEach(responseDoc => {
                        const response = responseDoc.response;
                        if (response && Array.isArray(response.selected)) {
                            response.selected.forEach((selectedItem, index) => {
                                const choice = selectedItem.question;
                                if (ranks.hasOwnProperty(choice)) {
                                    // Add the rank (index) to the total rank for this choice
                                    ranks[choice] += index + 1;  // Adding 1 because index is 0-based
                                }
                            });
                        }
                    });

                    // Sort ranks by total rank values
                    const sortedRanks = Object.entries(ranks).sort((a, b) => a[1] - b[1]);
                    // const data = {
                    //     ...postData.responseData.response,
                    //     contended: []
                    // }

                    // Calculate the total rank sum
                    const totalRanksSum = Object.values(ranks).reduce((sum, rank) => sum + rank, 0);

                    // Calculate the inverted percentages
                    const invertedPercentages = {};
                    choices.forEach(choice => {
                        const choiceRank = ranks[choice];
                        // Calculate the inverted rank sum as the difference between the total rank sum and the choice's rank sum
                        const invertedRank = totalRanksSum - choiceRank;
                        invertedPercentages[choice] = (invertedRank / (totalRanksSum * (choices.length - 1))) * 100;
                    });

                    // Transform inverted percentages to formatted strings
                    const formattedPercentages = {};
                    Object.entries(invertedPercentages).forEach(([choice, percentage]) => {
                        formattedPercentages[choice] = `${Math.round(percentage)}%`;
                    });

                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        // startQuestData: {
                        //     uuid: responseDataDoc.responsingUserUuid,
                        //     postId: postId,
                        //     data: [data],
                        //     questForeignKey: post.questForeginKey._id,
                        //     addedAnswer: responseDataDoc.addedAnswer,
                        // },
                        // startStatus: responseDataDoc.startStatus,
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                        result: [
                            {
                                selected: ranks
                            }
                        ],
                        selectedPercentage: [
                            formattedPercentages
                        ],
                    };
                }
                else if (responseDataStats[0].yesNo) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Yes: responseDataStats[0].yesNo.Yes,
                                    No: responseDataStats[0].yesNo.No,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Yes: (Math.round(responseDataStats[0].yesNo.YesPercentage)).toString() + "%",
                                No: (Math.round(responseDataStats[0].yesNo.NoPercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].agreeDisagree) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Agree: responseDataStats[0].agreeDisagree.Agree,
                                    Disagree: responseDataStats[0].agreeDisagree.Disagree,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Agree: (Math.round(responseDataStats[0].agreeDisagree.AgreePercentage)).toString() + "%",
                                Disagree: (Math.round(responseDataStats[0].agreeDisagree.DisagreePercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].likeDislike) {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: [
                            {
                                selected: {
                                    Like: responseDataStats[0].likeDislike.Like,
                                    Dislike: responseDataStats[0].likeDislike.Dislike,
                                }
                            }
                        ],
                        selectedPercentage: [
                            {
                                Like: (Math.round(responseDataStats[0].likeDislike.LikePercentage)).toString() + "%",
                                Dislike: (Math.round(responseDataStats[0].likeDislike.DislikePercentage)).toString() + "%",
                            }
                        ],
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else if (responseDataStats[0].multipleChoice) {
                    let result = [{
                        selected: {}
                    }];
                    responseDataStats[0].multipleChoice.forEach(item => {
                        result[0].selected[item.question] = item.count;
                    });
                    let selectedPercentage = [{}];
                    // Iterate over the multipleChoice array and populate the object
                    responseDataStats[0].multipleChoice.forEach(item => {
                        selectedPercentage[0][item.question] = (Math.round(item.percentage)).toString() + "%";
                    });
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        result: result,
                        selectedPercentage: selectedPercentage,
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
                else {
                    questForeginKeyWithStartQuestData = {
                        ...post.questForeginKey.toObject(), // Convert Mongoose document to plain JS object
                        bookmark: bookmark ? true : false,
                        getUserBadge: {
                            _id: user._id,
                            badges: user.badges,
                        },
                    };
                }
            }
            else {
                questForeginKeyWithStartQuestData = {
                    ...post.questForeginKey.toObject(),
                    bookmark: bookmark ? true : false,
                    getUserBadge: {
                        _id: user._id,
                        badges: user.badges,
                    },
                }
            }

            const desiredResult = await getQuestByIdQuestForeignKey(post.questForeginKey._id.toString());
            const questResult = questForeginKeyWithStartQuestData.result && questForeginKeyWithStartQuestData.result[0].selected ? questForeginKeyWithStartQuestData.result[0].selected : {};
            const desiredResultSelected = desiredResult.result && desiredResult.result[0].selected ? desiredResult.result[0].selected : {};

            // Initialize merged result
            const mergedResult = {};

            // Sum counts from questData.result
            for (const [key, value] of Object.entries(questResult)) {
                if (mergedResult[key]) {
                    mergedResult[key] += value;
                } else {
                    mergedResult[key] = value;
                }
            }

            // Sum counts from desiredResult.result
            for (const [key, value] of Object.entries(desiredResultSelected)) {
                if (mergedResult[key]) {
                    mergedResult[key] += value;
                } else {
                    mergedResult[key] = value;
                }
            }

            // Calculate the total count for percentage calculation
            const totalCount = Object.values(mergedResult).reduce((sum, count) => sum + count, 0);

            // Calculate new percentages
            const newSelectedPercentage = {};
            for (const [key, value] of Object.entries(mergedResult)) {
                newSelectedPercentage[key] = Math.round((value / totalCount) * 100) + '%';
            }

            // //console.log("mergedResult", { selected: mergedResult })
            // //console.log("newSelectedPercentage", [newSelectedPercentage])

            const questForeginKeyWithStartQuestDataR = {
                ...desiredResult,
                bookmark: bookmark ? true : false,
                result: [{selected: mergedResult}],
                selectedPercentage: [newSelectedPercentage]
                // getUserBadge: {
                //     _id: user._id,
                //     badges: user.badges,
                // },
            }

            //console.log(questForeginKeyWithStartQuestDataR)
            
            updatedPosts.push({
                ...post.toObject(),
                questForeginKey: questForeginKeyWithStartQuestDataR
            })

            //console.log(updatedPosts)

        }

        const newCategoryDoc = {
            category: categoryDoc.category,
            post: updatedPosts,
            link: categoryDoc.link,
            isLinkUserCustomized: categoryDoc.isLinkUserCustomized,
            clicks: categoryDoc.clicks,
            participents: categoryDoc.participents,
            createdAt: categoryDoc.createdAt,
            updatedAt: categoryDoc.updatedAt,
            deletedAt: categoryDoc.deletedAt,
            isActive: categoryDoc.isActive,
            _id: categoryDoc._id
        };

        res.status(200).json({
            message: `Category found successfully`,
            category: newCategoryDoc,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const categoryViewCount = async (req, res) => {
    try {

        const { categoryLink } = req.params;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            'list.link': categoryLink
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });

        if (!userList) throw new Error(`No list is found with the category link: ${categoryLink}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.find(obj => obj.link === categoryLink);
        if (!categoryDoc) throw new Error('Category not found');


        if (categoryDoc.clicks === null) {
            categoryDoc.clicks = 1;
        }
        else {
            categoryDoc.clicks = categoryDoc.clicks + 1;
        }

        categoryDoc.updatedAt = new Date().toISOString();
        userList.updatedAt = new Date().toISOString();
        await userList.save();

        res.status(200).json({
            message: `Category View Count found successfully`,
            categoryViewCount: categoryDoc.clicks,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const categoryParticipentsCount = async (req, res) => {
    try {

        const { categoryLink } = req.params;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            'list.link': categoryLink
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });

        if (!userList) throw new Error(`No list is found with the category link: ${categoryLink}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.find(obj => obj.link === categoryLink);
        if (!categoryDoc) throw new Error('Category not found');


        if (categoryDoc.participents === null) {
            categoryDoc.participents = 1;
        }
        else {
            categoryDoc.participents = categoryDoc.participents + 1;
        }

        categoryDoc.updatedAt = new Date().toISOString();
        userList.updatedAt = new Date().toISOString();
        await userList.save();

        res.status(200).json({
            message: `Category Participents Count found successfully`,
            categoryParticipentsCount: categoryDoc.participents,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const categoryStatistics = async (req, res) => {
    try {

        const { categoryLink } = req.params;

        // Find the user list that contains a category with the given link
        const userList = await UserListSchema.findOne({
            'list.link': categoryLink
        }).populate({
            path: 'list.post.questForeginKey',
            model: 'InfoQuestQuestions'
        });

        if (!userList) throw new Error(`No list is found with the category link: ${categoryLink}`);

        // Find the category within the list array based on the category link
        const categoryDoc = userList.list.find(obj => obj.link === categoryLink);
        if (!categoryDoc) throw new Error('Category not found');
        res.status(200).json({
            message: `Category Statistics found successfully`,
            categoryViewCount: categoryDoc.clicks,
            categoryParticipentsCount: categoryDoc.participents,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const updatePostOrder = async (req, res) => {
    try {
        const { order, userUuid, categoryId } = req.body;

        const userList = await UserListSchema.findOne({ userUuid: userUuid })
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        // Find the category within the list array based on categoryId
        const categoryDoc = userList.list.id(categoryId);
        if (!categoryDoc) throw new Error('Category not found');

        // Create a map of _id to order based on the order array in req.body
        const orderMap = {};
        order.forEach((postId, index) => {
            orderMap[postId] = index;
        });

        categoryDoc.post.forEach(post => {
            let postIdString = post._id.toString();
            // Use the `hasOwnProperty` method to check for the key in orderMap
            if (!orderMap.hasOwnProperty(postIdString)) throw new Error(`Wrong identifires are being sent in order: ${order}`);
            post.order = orderMap[postIdString]; // Access the value using the key

        });

        await userList.save();

        res.status(200).json({
            message: `List order implemented Successfully!`,
            userList: userList,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const addPostInCategoryInUserList = async (req, res) => {
    try {
        const { userUuid, categoryIdArray, questForeginKey } = req.body;

        // Find UserList Document
        const userList = await UserListSchema.findOne({
            userUuid: userUuid
        })
        if (!userList) throw new Error(`No list is found for User: ${userUuid}`);

        let categoryDoc;
        for (const categoryId of categoryIdArray) {
            categoryDoc = userList.list.id(categoryId);
            if (!categoryDoc) {
                return res.status(404).json({ message: `Category not found: ${categoryId}` });
            }

            const questForeginKeyExists = categoryDoc.post.some(obj => obj.questForeginKey.equals(questForeginKey));
            if (questForeginKeyExists) continue;

            const newPost = new PostSchema({
                questForeginKey: questForeginKey,
                order: categoryDoc.postCounter,
            });
            categoryDoc.post.push(newPost);
            categoryDoc.postCounter = categoryDoc.postCounter + 1;
            categoryDoc.updatedAt = new Date().toISOString();
        }
        userList.updatedAt = new Date().toISOString();

        await userList.save();

        const populatedUserList = await UserListSchema.findOne({ userUuid: userUuid })
            .populate({
                path: 'list.post.questForeginKey',
                model: 'InfoQuestQuestions'
            });

        res.status(200).json({
            message: `Post is added successfully into your category: ${categoryDoc.category}`,
            userList: populatedUserList.list,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

const submitResponse = async (req, res) => {
    try {
        const postId = req.body.postId;
        const responsingUserUuid = req.body.uuid;
        const response = req.body.data;
        const addedAnswer = req.body.addedAnswer;

        // Find postData Document
        let postData = await PostDataSchema.findOne({ postId: new mongoose.Types.ObjectId(postId) })
        if (!postData) {
            postData = new PostDataSchema({
                postId: new mongoose.Types.ObjectId(postId)
            })
            await postData.save();
        }

        let newPostData;
        if (req.body.addedAnswer) {
            newPostData = new ResponseDataSchema({
                responsingUserUuid: responsingUserUuid,
                response: response,
                addedAnswer: addedAnswer,
                startStatus: "change answer"
            });
        } else {
            newPostData = new ResponseDataSchema({
                responsingUserUuid: responsingUserUuid,
                response: response,
                startStatus: "change answer"
            });
        }

        postData.responseData.push(newPostData);
        postData.updatedAt = new Date().toISOString();

        await postData.save();
        res.status(200).json({
            message: `Post Response Submitted w.r.t List ${postId}`,
            userList: postData,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: `An error occurred while getting the userList: ${error.message}`,
        });
    }
}

module.exports = {
    userList,
    addCategoryInUserList,
    findCategoryById,
    findCategoryByName,
    updateCategoryInUserList,
    deleteCategoryFromList,
    generateCategoryShareLink,
    findCategoryByLink,
    viewList,
    viewListAll,
    categoryViewCount,
    categoryParticipentsCount,
    categoryStatistics,
    updatePostOrder,
    addPostInCategoryInUserList,
    submitResponse
};