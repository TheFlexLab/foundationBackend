const { ACCOUNT_BADGE_ADDED_AMOUNT } = require("../constants");
const UserModel = require("../models/UserModel");
const { createToken } = require("../service/auth");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices");
const { eduEmailCheck } = require("../utils/eduEmailCheck");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const { JWT_SECRET, FRONTEND_URL } = require("../config/env");
const { error } = require("console");
const Company = require("../models/Company");
const JobTitle = require("../models/JobTitle");
const DegreeAndFieldOfStudy = require("../models/DegreeAndFieldOfStudy");
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const personalKeys = ["firstName", "lastName", "security-question"];
const noEncDecPersonalKeys = [
  "geolocation",
  "dateOfBirth",
  "currentCity",
  "homeTown",
  "relationshipStatus",
];

// Encryption/Decryption Security Purposes.
const {
  encryptData,
  decryptData,
  userCustomizedEncryptData,
  userCustomizedDecryptData,
} = require("../utils/security");

const Treasury = require("../models/Treasury");
const { type } = require("os");

const update = async (req, res) => {
  try {
    let legacyEmail = false;
    const { userId, badgeId } = req.params;
    const User = await UserModel.findOne({ _id: userId });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const userBadges = User.badges;
    const updatedUserBadges = userBadges.map((item) => {
      if (item._id.toHexString() == badgeId) {
        if (item.accountName === "Email") {
          legacyEmail = true;
        }
        return { ...item, type: req.body.type, primary: req.body.primary };
        // return item.type = req.body.type;
      }
    });
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    User.requiredAction = false;
    await User.save();

    // Generate a JWT token
    const token = createToken({ uuid: User.uuid });

    // Decrypt Saved Data
    const decryptUser = User._doc;

    if (!legacyEmail) {
      decryptUser.badges[0].details = decryptData(
        decryptUser.badges[0].details
      );
    }

    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while update Ledger: ${error.message}`,
    });
  }
};

const getBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const User = await UserModel.findOne({ uuid: userId });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const userBadges = User.badges;

    res.status(200).json({ userBadges });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while update Ledger: ${error.message}`,
    });
  }
};

// ALERT: API is not being used at FE send `req.body.uuid` before use.
const addBadgeSocial = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    // const User = await UserModel.findOne({ uuid: req.cookies.uuid });
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { accountId: req.user._json.id } },
    });
    if (usersWithBadge.length !== 0) throw new Error("Badge already exist");

    const userBadges = User.badges;
    const updatedUserBadges = [
      ...userBadges,
      {
        accountId: req.user._json.id,
        accountName: req.user.provider,
        isVerified: true,
        type: "default",
      },
    ];
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.user.provider,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.user.provider,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.clearCookie("social");
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const addContactBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const eyk = req.body.infoc;
    // Check education Email
    if (req.body.type === "education") {
      let emailStatus;
      if (req.body.provider) {
        // Check Email Category
        emailStatus = await eduEmailCheck(req, res, req.body._json.email);
      } else {
        // Check Email Category
        emailStatus = await eduEmailCheck(req, res, req.body.email);
      }
      //console.log("🚀 ~ addContactBadge ~ emailStatus:", emailStatus);
      if (emailStatus.status !== "OK") throw new Error(emailStatus.message);
    }

    if (req.body.legacy) {
      // Find the Badge
      const usersWithBadge = await UserModel.find({
        badges: { $elemMatch: { email: req.body.email } },
      });
      // Find the User Email
      const usersWithEmail = await UserModel.find({
        email: req.body.email,
      });
      //console.log("wamiq", usersWithBadge);
      if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
        throw new Error("Oops! This account is already linked.");

      // Send an email
      await sendVerifyEmail({
        email: req.body.email,
        uuid: req.body.uuid,
        type: req.body.type,
      });
      res.status(201).json({
        message: `Sent a verification email to ${req.body.email}`,
      });
      return;
    }
    if (req.body.type === "cell-phone") {
      // Find the Badge
      let usersWithBadge;
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        usersWithBadge = await UserModel.find({
          badges: {
            $elemMatch: {
              details: userCustomizedEncryptData(encryptData(req.body), eyk),
            },
          },
        });
      } else {
        usersWithBadge = await UserModel.find({
          badges: {
            $elemMatch: { details: encryptData(req.body) },
          },
        });
      }
      if (usersWithBadge.length !== 0) {
        throw new Error("Oops! This account is already linked.");
      }
      const userBadges = User.badges;
      let updatedUserBadges;
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        updatedUserBadges = [
          ...userBadges,
          {
            type: req.body.type,
            details: userCustomizedEncryptData(encryptData(req.body), eyk),
          },
        ];
      } else {
        updatedUserBadges = [
          ...userBadges,
          {
            type: req.body.type,
            details: encryptData(req.body),
          },
        ];
      }

      // Update the user badges
      User.badges = updatedUserBadges;
      // Update the action
      await User.save();

      res.status(200).json({ message: "Badge Added Successfully" });
      return;
    }
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: { accountId: req.body.id, accountName: req.body.provider },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;

    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.id,
          accountName: req.body.provider,
          isVerified: true,
          type: req.body.type,
          details: userCustomizedEncryptData(encryptData(req.body), eyk),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.id,
          accountName: req.body.provider,
          isVerified: true,
          type: req.body.type,
          details: encryptData(req.body),
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    // res.clearCookie("social");
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addContactBadge: ${error.message}`,
    });
  }
};

const addBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const eyk = req.body.infoc;
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
          details: userCustomizedEncryptData(encryptData(req.body.data), eyk),
          isVerified: true,
          type: "default",
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
          details: encryptData(req.body.data),
          isVerified: true,
          type: "default",
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.provider,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.provider,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const addCompany = async (req, res) => {
  try {
    const company = new Company({
      name: req.body.name,
      country: req.body.country,
      state_province: req.body.state_province,
      uuid: req.body.uuid,
    });

    const data = await company.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding company", err });
  }
};

const addJobTitle = async (req, res) => {
  try {
    const job = new JobTitle({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};
const addDegreesAndFields = async (req, res) => {
  try {
    const resp = new DegreeAndFieldOfStudy({
      name: req.body.name,
      uuid: req.body.uuid,
      type: req.body.type,
    });

    const data = await resp.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};
const addPersonalBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;
    let updatedUserBadges;
    const foundKey = personalKeys.find((key) =>
      req.body.personal.hasOwnProperty(key)
    );
    const noEncDecKey = noEncDecPersonalKeys.find((key) =>
      req.body.personal.hasOwnProperty(key)
    );
    if (noEncDecKey) {
      updatedUserBadges = [
        ...userBadges,
        {
          personal: req.body.personal,
        },
      ];
      // console.log(updatedUserBadges);
    } else {
      if (User.isPasswordEncryption) {
        if (!req.body.infoc)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        if (foundKey) {
          // Create an encrypted object with the found key
          const encryptedPersonal = {
            [foundKey]: userCustomizedEncryptData(
              encryptData(req.body.personal[foundKey]),
              eyk
            ),
          };

          // Update the user badges with the encrypted personal information
          updatedUserBadges = [
            ...userBadges,
            {
              personal: encryptedPersonal,
            },
          ];
          // console.log(updatedUserBadges);
        } else {
          // Handle case where no key is found, if needed
          console.log("No matching key found in personal object.");
        }
      } else {
        if (foundKey) {
          // Create an encrypted object with the found key
          const encryptedPersonal = {
            [foundKey]: encryptData(req.body.personal[foundKey]),
          };

          // Update the user badges with the encrypted personal information
          updatedUserBadges = [
            ...userBadges,
            {
              personal: encryptedPersonal,
            },
          ];
          // console.log(updatedUserBadges);
        } else {
          // Handle case where no key is found, if needed
          console.log("No matching key found in personal object.");
        }
      }
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: foundKey,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: foundKey,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const removeAWorkEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object to remove
    const indexToRemove = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          console.log(edu.id, req.body.id);
          return edu.id === req.body.id;
        })
      );
    });
    if (indexToRemove !== -1) {
      if (userBadges[indexToRemove].personal[req.body.type].length === 1) {
        userBadges.splice(indexToRemove, 1);
      } else {
        // Find the index of the education object within the found badge
        const educationIndexToRemove = userBadges[indexToRemove].personal[
          req.body.type
        ].findIndex((edu) => edu.id === req.body.id);

        if (educationIndexToRemove !== -1) {
          // Remove the education object from the array
          userBadges[indexToRemove].personal[req.body.type].splice(
            educationIndexToRemove,
            1
          );
        } else {
          throw new Error("Badge Not Found");
        }
      }
    } else {
      throw new Error("Badges Not Found");
    }
    User.badges = userBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "personal",
      });
    }

    User.markModified("badges");
    // Save the updated user document
    const data = await User.save();

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

// const removeAWorkEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object to remove
//     const indexToRemove = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //console.log(edu.id, req.body.id);
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     if (indexToRemove !== -1) {
//       if (userBadges[indexToRemove].personal[req.body.type].length === 1) {
//         userBadges.splice(indexToRemove, 1);
//       } else {
//         // Find the index of the education object within the found badge
//         const educationIndexToRemove = decryptedUserBadges[
//           indexToRemove
//         ].personal[req.body.type].findIndex((edu) => edu.id === req.body.id);

//         if (educationIndexToRemove !== -1) {
//           // Remove the education object from the array
//           userBadges[indexToRemove].personal[req.body.type].splice(
//             educationIndexToRemove,
//             1
//           );
//         } else {
//           throw new Error("Badge Not Found");
//         }
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }
//     User.badges = userBadges;
//     User.markModified("badges");
//     // Save the updated user document
//     const data = await User.save();
//     res.status(200).json({ data, message: "Successful" });
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
//     });
//   }
// };

// const getAWorkAndEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object to remove
//     const index = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //console.log(edu.id, req.body.id);
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     let obj;
//     if (index !== -1) {
//       // Find the index of the education object within the found badge
//       const educationIndex = decryptedUserBadges[index].personal[
//         req.body.type
//       ].findIndex((edu) => edu.id === req.body.id);

//       if (educationIndex !== -1) {
//         // Remove the education object from the array
//         obj =
//           decryptedUserBadges[index].personal[req.body.type][educationIndex];
//       } else {
//         throw new Error("Badge Not Found");
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }

//     res.status(200).json({ obj, message: "Successful" });
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while fetching WorkEducationBadge: ${error.message}`,
//     });
//   }
// };

const getAWorkAndEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object to remove
    const index = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          // console.log(edu.id, req.body.id);
          return edu.id === req.body.id;
        })
      );
    });
    let obj;
    if (index !== -1) {
      // Find the index of the education object within the found badge
      const educationIndex = userBadges[index].personal[
        req.body.type
      ].findIndex((edu) => edu.id === req.body.id);

      if (educationIndex !== -1) {
        // Remove the education object from the array
        obj = userBadges[index].personal[req.body.type][educationIndex];
      } else {
        throw new Error("Badge Not Found");
      }
    } else {
      throw new Error("Badges Not Found");
    }

    res.status(200).json({ obj, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

const getPersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;

    // Find the index of the object to remove
    const index = userBadges.findIndex((badge) => {
      return badge.personal && badge.personal[req.body.type];
    });

    let obj;
    if (User.isPasswordEncryption) {
      if (!eyk) throw new Error("Please Provide Password");
      if (index !== -1) {
        // Find the index of the education object within the found badge
        if (personalKeys.includes(req.body.type)) {
          obj = decryptData(
            userCustomizedDecryptData(
              userBadges[index].personal[req.body.type],
              eyk
            )
          );
        } else {
          obj = userBadges[index].personal[req.body.type];
        }
      } else {
        throw new Error("Badges Not Found");
      }
    } else {
      if (index !== -1) {
        // Find the index of the education object within the found badge
        if (personalKeys.includes(req.body.type)) {
          obj = decryptData(userBadges[index].personal[req.body.type]);
        } else {
          obj = userBadges[index].personal[req.body.type];
        }
      } else {
        throw new Error("Badges Not Found");
      }
    }

    res.status(200).json({ obj, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

// const updateWorkAndEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object
//     const index = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //console.log(edu.id, req.body.id, "new");
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     if (index !== -1) {
//       // Find the index of the education object within the found badge
//       const educationIndex = decryptedUserBadges[index].personal[
//         req.body.type
//       ].findIndex((edu) => edu.id === req.body.id);

//       if (educationIndex !== -1) {
//         if (User.isPasswordEncryption) {
//           if (!req.body.infoc)
//             throw new Error(
//               "No eyk Provided in request body, Request can't be proceeded."
//             );
//           // Overwrite the existing object with new data
//           userBadges[index].personal[req.body.type][educationIndex] =
//             userCustomizedEncryptData(
//               encryptData(req.body.newData),
//               req.body.infoc
//             );
//         } else {
//           userBadges[index].personal[req.body.type][educationIndex] =
//             encryptData(req.body.newData);
//         }

//         // Update the modified user document
//         User.badges = userBadges;
//         User.markModified("badges");
//         const data = await User.save();

//         return res
//           .status(200)
//           .json({ data, message: "Object updated successfully" });
//       } else {
//         throw new Error("Badge Not Found");
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while updating the object: ${error.message}`,
//     });
//   }
// };

const updateWorkAndEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object
    const index = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          // console.log(edu.id, req.body.id, "new");
          return edu.id === req.body.id;
        })
      );
    });
    if (index !== -1) {
      // Find the index of the education object within the found badge
      const educationIndex = userBadges[index].personal[
        req.body.type
      ].findIndex((edu) => edu.id === req.body.id);

      if (educationIndex !== -1) {
        // Overwrite the existing object with new data
        userBadges[index].personal[req.body.type][educationIndex] =
          req.body.newData;

        // Update the modified user document
        User.badges = userBadges;
        User.markModified("badges");
        const data = await User.save();

        return res
          .status(200)
          .json({ data, message: "Object updated successfully" });
      } else {
        throw new Error("Badge Not Found");
      }
    } else {
      throw new Error("Badges Not Found");
    }
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while updating the object: ${error.message}`,
    });
  }
};

const addWorkEducationBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const newData = req.body.data;
    const userBadges = User.badges;
    const eyk = req.body.infoc;

    const personalBadgeIndex = userBadges.findIndex(
      (badge) => badge.personal && badge.personal[req.body.type]
    );
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      if (personalBadgeIndex !== -1) {
        User.badges[personalBadgeIndex].personal[req.body.type].push(newData);
        User.markModified("badges");
      } else {
        User.badges.push({
          personal: {
            [req.body.type]: [newData],
          },
        });
      }
    } else {
      if (personalBadgeIndex !== -1) {
        User.badges[personalBadgeIndex].personal[req.body.type].push(newData);
        User.markModified("badges");
      } else {
        User.badges.push({
          personal: { [req.body.type]: [newData] },
        });
      }
    }
    const data = await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Update the action

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};
const addWeb3Badge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          web3: userCustomizedEncryptData(encryptData(req.body.web3), eyk),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          web3: encryptData(req.body.web3),
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: "ethereum-wallet",
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: "ethereum-wallet",
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addWeb3Badge: ${error.message}`,
    });
  }
};

const removePersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges =
      userBadges?.filter(
        (badge) => !badge?.personal?.hasOwnProperty(req.body.type)
      ) || [];
    // Update the user badges
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName && b.type === "personal"
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "personal",
      });
    }

    // Update the action
    await User.save();
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const removeWeb3Badge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((badge) => {
      if (!badge.web3) {
        return badge;
      }
    });

    // Update the user badges

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "etherium-wallet",
      });
    }

    // Update the action
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const updatePersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;

    const index = userBadges.findIndex((badge) => {
      return badge.personal && badge.personal[req.body.type];
    });

    if (index !== -1) {
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        if (personalKeys.includes(req.body.type)) {
          userBadges[index].personal[req.body.type] = userCustomizedEncryptData(
            encryptData(req.body.newData),
            eyk
          );
        } else {
          userBadges[index].personal[req.body.type] = req.body.newData;
        }
      } else {
        if (personalKeys.includes(req.body.type)) {
          userBadges[index].personal[req.body.type] = encryptData(
            req.body.newData
          );
        } else {
          userBadges[index].personal[req.body.type] = req.body.newData;
        }
      }
    } else {
      throw new Error("Badge Not Found");
    }
    // Update the user badges
    User.badges = userBadges;
    User.markModified("badges");
    const data = await User.save();

    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while updatePersonalBadge: ${error.message}`,
    });
  }
};

const removeBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { accountId: req.body.badgeAccountId } },
    });
    if (usersWithBadge.length === 0) throw new Error("Badge not exist!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((item) => {
      if (item.accountId !== req.body.badgeAccountId) {
        return item;
      }
    });

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "social",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger

    // // Create Ledger
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "User",
    //   txFrom: User.uuid,
    //   txTo: "dao",
    //   txAmount: "0",
    //   txData: User.badges[0]._id,
    //   // txDescription : "User adds a verification badge"
    // });
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: "DAO Treasury",
    //   txTo: User.uuid,
    //   txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   // txData : newUser.badges[0]._id,
    //   // txDescription : "Incentive for adding badges"
    // });
    // // Decrement the Treasury
    // await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // // Increment the UserBalance
    // await updateUserBalance({
    //   uuid: User.uuid,
    //   amount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   inc: true,
    // });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const removeContactBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { type: req.body.type } },
    });
    if (usersWithBadge.length === 0) throw new Error("Badge not exist!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((item) => {
      if (item.type !== req.body.type) {
        return item;
      }
    });

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "contact",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger

    // // Create Ledger
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "User",
    //   txFrom: User.uuid,
    //   txTo: "dao",
    //   txAmount: "0",
    //   txData: User.badges[0]._id,
    //   // txDescription : "User adds a verification badge"
    // });
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: "DAO Treasury",
    //   txTo: User.uuid,
    //   txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   // txData : newUser.badges[0]._id,
    //   // txDescription : "Incentive for adding badges"
    // });
    // // Decrement the Treasury
    // await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // // Increment the UserBalance
    // await updateUserBalance({
    //   uuid: User.uuid,
    //   amount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   inc: true,
    // });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const sendVerifyEmail = async ({ email, uuid, type }) => {
  try {
    const verificationTokenFull = jwt.sign({ uuid, email, type }, JWT_SECRET, {
      expiresIn: "10m",
    });
    const verificationToken = verificationTokenFull.substr(
      verificationTokenFull.length - 6
    );

    // const verificationToken = user.generateVerificationToken();
    //console.log("verificationToken", verificationToken);

    // Step 3 - Email the user a unique verification link
    // const url = `${FRONTEND_URL}/VerifyCode?token=${verificationTokenFull}&badge=true`;
    const url = `${FRONTEND_URL}/badgeverifycode?token=${verificationTokenFull}&badge=true`;

    const SES_CONFIG = {
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
    // Create SES service object
    //console.log("before sesClient", SES_CONFIG);

    const sesClient = new AWS.SES(SES_CONFIG);

    let params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: [email],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `Click <a href = '${url}'>here</a> to confirm your email <br /> <br /> <br />
                   And confirm this code <b>${verificationToken}</b> from the App`,
          },
          Text: {
            Charset: "UTF-8",
            Data: "Verify Accountt",
          },
        },

        Subject: {
          Charset: "UTF-8",
          Data: "Verify Account",
        },
      },
    };

    try {
      const emailRes = await sesClient.sendEmail(params).promise();
      return emailRes;
    } catch (error) {
      //console.log(error);
    }

    // return res.status(200).send({
    //   message: `Sent a verification email to ${email}`,
    // });
  } catch (error) {
    console.error(error.message);
    // res.status(500).json({
    //   message: `An error occurred while sendVerifyEmail Auth: ${error.message}`,
    // });
  }
};

const addContactBadgeVerify = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);

    const User = await UserModel.findOne({ uuid: decodedToken.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { email: decodedToken.email } },
    });
    // Find the User Email
    const usersWithEmail = await UserModel.find({
      email: decodedToken.email,
    });
    if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
      throw new Error("Badge already exist");

    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     email: decodedToken.email,
    //     isVerified: false,
    //     type: decodedToken.type,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    return res.status(200).json({ message: "Continue" });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const addContactBadgeAdd = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);

    const User = await UserModel.findOne({ uuid: decodedToken.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { email: decodedToken.email } },
    });
    // Find the User Email
    const usersWithEmail = await UserModel.find({
      email: decodedToken.email,
    });
    //console.log("wamiq", usersWithBadge);
    if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    const updatedUserBadges = [
      ...userBadges,
      {
        email: decodedToken.email,
        isVerified: true,
        type: decodedToken.type,
      },
    ];
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();
    res.status(200).json({ ...User._doc });
  } catch (error) {
    return res.status(500).json({
      // message: error.message,
      message: `An error occurred while addContactBadge: ${error.message}`,
    });
  }
};

const addPasskeyBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!req.body.eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: userCustomizedEncryptData(encryptData(req.body.data), eyk),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: encryptData(req.body.data),
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();
    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     passKey: req.body.passKey,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: User.badges[0]._id,
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPassKeyBadge: ${error.message}`,
    });
  }
};

const addFarCasterBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!req.body.eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: userCustomizedEncryptData(
            encryptData(req.body.data),
            req.body.eyk
          ),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: encryptData(req.body.data),
        },
      ];
    }

    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();
    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     passKey: req.body.passKey,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addFarCasterBadge: ${error.message}`,
    });
  }
};

const removePasskeyBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter(
      (badge) =>
        badge.accountName !== req.body.accountName ||
        badge.type !== req.body.type
    );
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "web3",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const removeFarCasterBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter(
      (badge) =>
        badge.accountName !== req.body.accountName ||
        badge.type !== req.body.type
    );
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "social",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: User.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeFarCasterBadge: ${error.message}`,
    });
  }
};

const addPasswordBadgesUpdate = async (req, res) => {
  try {
    const { uuid, eyk } = req.body;
    const user = await User.findOne({
      uuid: uuid,
    });

    if (user.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );

      // console.log("Remove Legacy Encryption!");

      // As Legacy Password is added so we need to Remove it.
      user.badges.forEach((badge) => {
        if (
          badge.legacy ||
          badge.accountName === "Email" ||
          (badge.type === "work" && !badge.details) ||
          (badge.type === "education" && !badge.details)
        ) {
          return;
        } else if (badge.type && badge.type === "cell-phone") {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        } else if (
          badge.type &&
          ["work", "education", "personal", "social", "default"].includes(
            badge.type
          )
        ) {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        } else if (
          badge.accountName &&
          [
            "facebook",
            "linkedin",
            "twitter",
            "instagram",
            "github",
            "Email",
            "google",
          ].includes(badge.accountName)
        ) {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        }
        // else if (badge.personal && badge.personal.work) {
        //   badge.personal.work = badge.personal.work.map((item) =>
        //     userCustomizedDecryptData(item, eyk)
        //   );
        // }
        else if (badge.personal) {
          const decryptedPersonal = badge.personal;
          for (const key of personalKeys) {
            if (badge.personal.hasOwnProperty(key)) {
              decryptedPersonal[key] = userCustomizedDecryptData(
                badge.personal[key],
                eyk
              );
            }
          }
          badge.personal = decryptedPersonal;
        } else if (badge.web3) {
          badge.web3 = userCustomizedDecryptData(badge.web3, eyk);
        } else if (
          badge.type &&
          ["desktop", "mobile", "farcaster"].includes(badge.type)
        ) {
          badge.data = userCustomizedDecryptData(badge.data, eyk);
        }
      });

      // Find the index of badges with legacy key
      const index = user.badges.findIndex(
        (badge) => badge.legacy !== undefined
      );
      // If index is found, remove the badge with legacy key
      if (index !== -1) {
        user.badges.splice(index, 1);
      }
      user.isPasswordEncryption = false;

      // Find if badgeName already exists in badgeRemoved array
      const badgeIndex = user.badgeRemoved.findIndex(
        (b) => b.badgeName === req.body.badgeName
      );

      if (badgeIndex !== -1) {
        // If badgeName exists, update the deletedAt
        user.badgeRemoved[badgeIndex].deletedAt = new Date();
      } else {
        // If badgeName does not exist, create a new entry
        user.badgeRemoved.push({
          badgeName: req.body.badgeName,
          deletedAt: new Date(),
          type: "password",
        });
      }
      await user.save();

      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeRemoved",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: "legacy",
        // txDescription : "User adds a verification badge"
      });
      res.status(200).json({
        message: `User's customized password decryption is removed successful.`,
        data: user,
      });
    } else if (!user.isPasswordEncryption) {
      // console.log("Apply Legacy Encryption!");

      // Treasury Check
      const checkTreasury = await Treasury.findOne();
      if (!checkTreasury)
        return res.status(404).json({ message: "Treasury is not found." });
      if (
        Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
        Math.round(checkTreasury.amount) <= 0
      )
        return res.status(404).json({ message: "Treasury is not enough." });

      // As Legacy Password is removed so we need to Add it.
      user.badges.forEach((badge) => {
        if (
          badge.legacy ||
          badge.accountName === "Email" ||
          (badge.type === "work" && !badge.details) ||
          (badge.type === "education" && !badge.details)
        ) {
          return;
        } else if (badge.type && badge.type === "cell-phone") {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        } else if (
          badge.type &&
          ["work", "education", "personal", "social", "default"].includes(
            badge.type
          )
        ) {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        } else if (
          badge.accountName &&
          [
            "facebook",
            "linkedin",
            "twitter",
            "instagram",
            "github",
            "Email",
            "google",
          ].includes(badge.accountName)
        ) {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        }
        // else if (badge.personal && badge.personal.work) {
        //   badge.personal.work = badge.personal.work.map((item) =>
        //     userCustomizedEncryptData(item, eyk)
        //   );
        // }
        else if (badge.personal) {
          const encryptedPersonal = badge.personal;
          for (const key of personalKeys) {
            if (badge.personal.hasOwnProperty(key)) {
              encryptedPersonal[key] = userCustomizedEncryptData(
                badge.personal[key],
                eyk
              );
            }
          }
          badge.personal = encryptedPersonal;
        } else if (badge.web3) {
          badge.web3 = userCustomizedEncryptData(badge.web3, eyk);
        } else if (
          badge.type &&
          ["desktop", "mobile", "farcaster"].includes(badge.type)
        ) {
          badge.data = userCustomizedEncryptData(badge.data, eyk);
        }
      });
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      const userBadges = user.badges;
      let updatedUserBadges;
      updatedUserBadges = [
        ...userBadges,
        {
          legacy: true,
        },
      ];
      user.badges = updatedUserBadges;
      user.isPasswordEncryption = true;
      await user.save();
      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: "legacy",
        // txDescription : "User adds a verification badge"
      });
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: user.uuid,
        txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
        txData: "legacy",
        // txDescription : "Incentive for adding badges"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

      // Increment the UserBalance
      await updateUserBalance({
        uuid: user.uuid,
        amount: ACCOUNT_BADGE_ADDED_AMOUNT,
        inc: true,
      });

      user.fdxEarned = user.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
      user.rewardSchedual.addingBadgeFdx =
        user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
      await user.save();

      res.status(200).json({
        message: `User's customized password encryption is added successful.`,
        data: user,
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while processing your security badge: ${error.message}`,
    });
  }
};

module.exports = {
  update,
  getBadges,
  addBadgeSocial,
  addBadge,
  removeBadge,
  addContactBadge,
  addContactBadgeVerify,
  addContactBadgeAdd,
  addPersonalBadge,
  removePersonalBadge,
  updatePersonalBadge,
  addWeb3Badge,
  removeContactBadge,
  removeWeb3Badge,
  addWorkEducationBadge,
  removeAWorkEducationBadge,
  addCompany,
  addJobTitle,
  addDegreesAndFields,
  getAWorkAndEducationBadge,
  updateWorkAndEducationBadge,
  addPasskeyBadge,
  removePasskeyBadge,
  getPersonalBadge,
  addFarCasterBadge,
  removeFarCasterBadge,
  addPasswordBadgesUpdate,
};
