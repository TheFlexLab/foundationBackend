const User = require("../models/UserModel");
const { UserListSchema, CategorySchema, PostSchema } = require("../models/UserList");

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

module.exports = {
    createUserListForAllUsers,
};