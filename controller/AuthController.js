const User = require("../models/UserModel");
const {
  UserListSchema,
  CategorySchema,
  PostSchema,
} = require("../models/UserList");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
// const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");
const crypto = require("crypto");
const {
  createToken,
  googleVerify,
  cookieConfiguration,
} = require("../service/auth");
const { createLedger } = require("../utils/createLedger");
const { isGoogleEmail } = require("../utils/checkGoogleAccount");
const {
  createTreasury,
  getTreasury,
  updateTreasury,
} = require("../utils/treasuryService");
const { ACCOUNT_BADGE_ADDED_AMOUNT } = require("../constants");
const { getUserBalance, updateUserBalance } = require("../utils/userServices");
const { eduEmailCheck } = require("../utils/eduEmailCheck");
const { getRandomDigits } = require("../utils/getRandomDigits");
const { sendEmailMessage } = require("../utils/sendEmailMessage");
const { FRONTEND_URL, JWT_SECRET, FACEBOOK_APP_SECRET } = require("../config/env");
const UserQuestSetting = require("../models/UserQuestSetting");
const personalKeys = [
  "firstName",
  "lastName",
  "geolocation",
  "security-question",
  "dateOfBirth",
  "currentCity",
  "homeTown",
  "relationshipStatus",
];
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const StartQuests = require("../models/StartQuests");

// Encryption/Decryption Security Purposes.
const {
  encryptData,
  decryptData,
  userCustomizedEncryptData,
  userCustomizedDecryptData,
} = require("../utils/security");

const changePassword = async (req, res) => {
  try {
    const user = await User.findOne({ uuid: req.body.uuid });
    !user && res.status(404).json("User not Found");

    const currentPasswordValid = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );
    if (!currentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(req.body.newPassword, salt);

    // Update the user's password
    user.password = newHashedPassword;
    await user.save();
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountPasswordChange",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "User changes password"
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while changePassword Auth: ${error.message}`,
    });
  }
};

const signUpUser = async (req, res) => {
  try {
    const alreadyUser = await User.findOne({ email: req.body.email });
    if (alreadyUser) throw new Error("Email Already Exists");

    const checkGoogleEmail = await isGoogleEmail(req.body.email);
    if (checkGoogleEmail)
      throw new Error(
        "We have detected that this is a Google hosted e-mail-For greater security,please use 'Continue with Google'"
      );

    const uuid = crypto.randomBytes(11).toString("hex");
    //console.log(uuid);

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    const user = await new User({
      email: req.body.email,
      password: hashPassword,
      uuid: uuid,
      role: "user",
    });
    const users = await user.save();
    if (!users) throw new Error("User not Created");

    // Generate a JWT token
    // const token = createToken({ uuid: user.uuid });

    const userList = await UserListSchema.findOne({
      userUuid: uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    // Create Ledger
    // await createLedger({
    //   uuid: user.uuid,
    //   txUserAction: "accountLogin",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "User",
    //   txFrom: user.uuid,
    //   txTo: "dao",
    //   txAmount: "0",
    //   txData: user.uuid,
    //   // txDescription : "user logs in"
    // });

    await sendVerifyEmail(req, res);
    // res.status(200).json({ ...user._doc, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};

const signUpUserBySocialLogin = async (req, res) => {
  try {
    // if(req.query.GoogleAccount){
    //   signUpUserBySocialLogin(req, res)
    // }
    // Check Google Account
    const payload = req.body;
    // Check if email already exist
    const alreadyUser = await User.findOne({ email: payload.email });
    if (alreadyUser) throw new Error("Email Already Exists");

    const uuid = crypto.randomBytes(11).toString("hex");
    const user = await new User({
      email: payload.email,
      uuid: uuid,
      role: "user",
    });

    // Check Email Category
    const emailStatus = await eduEmailCheck(req, res, payload.email);
    let type = "";
    if (emailStatus.status === "OK") type = "Education";

    // Create a Badge at starting index
    user.badges.unshift({
      accountId: payload.sub,
      accountName: payload.provider,
      isVerified: true,
      details: encryptData(req.body),
      type: type,
    });

    // Update user verification status to true
    user.gmailVerified = payload.email_verified;
    await user.save();

    const userList = await UserListSchema.findOne({
      userUuid: user.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: user.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      // txData : user.badges[0]._id,
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

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    if (user.badges[0].type !== "Education") {
      user.requiredAction = true;
      await user.save();
    }

    // Decrypt Saved Data
    const decryptUser = user._doc;
    decryptUser.badges[0].details = decryptData(decryptUser.badges[0].details);

    res.cookie("uuid", user.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};

const signUpUserBySocialBadges = async (req, res) => {
  try {
    // Check Google Account
    const payload = req.body;
    // Check if email already exist

    let id;
    if (payload.type === "facebook") {
      id = payload.data.id;
    }

    if (payload.type === "twitter") {
      id = payload.data.user.uid;
    }

    if (payload.type === "github") {
      id = payload.data.user.uid;
    }

    if (payload.type === "instagram") {
      id = payload.data.user_id;
    }
    if (payload.type === "linkedin") {
      id = payload.data.sub;
    }

    const usersWithBadge = await User.find({
      badges: {
        $elemMatch: {
          accountId: id,
          accountName: payload.type,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const uuid = crypto.randomBytes(11).toString("hex");
    const user = await new User({
      email: payload.data.email ? payload.data.email : null,
      uuid: uuid,
      role: "user",
    });

    // Create a Badge at starting index
    user.badges.unshift({
      accountId: id,
      accountName: payload.type,
      details: encryptData(payload.data),
      isVerified: true,
      type: "social",
      primary: true,
    });

    // Update user verification status to true
    await user.save();

    const userList = await UserListSchema.findOne({
      userUuid: user.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: user.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      // txData : user.badges[0]._id,
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

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    if (payload.data.email && user.badges[0].type !== "Education") {
      user.requiredAction = true;
      await user.save();
    }

    // Decrypt Saved Data
    const decryptUser = user._doc;
    decryptUser.badges[0].details = decryptData(decryptUser.badges[0].details);

    res.cookie("uuid", user.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};

const signInUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) throw new Error("User not Found");

    // To check the google account
    if (user?.badges[0]?.accountName === "Gmail")
      throw new Error(
        "We have detected that this is a Google hosted e-mail-For greater security,please use 'Continue with Google'"
      );
    // To check the facebook account
    if (user?.badges[0]?.accountName === "Fmail")
      throw new Error("Please Login with Facebook Account");

    const compPass = await bcrypt.compare(req.body.password, user.password);

    if (!compPass) {
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountLoginFail",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: user.uuid,
        // txDescription : "User logs in failed"
      });
      return res.status(400).json("Wrong Password");
    }

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });

    res.cookie("uuid", user.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signInUser Auth: ${error.message}`,
    });
  }
};

const createGuestMode = async (req, res) => {
  try {
    const uuid = crypto.randomBytes(11).toString("hex");
    const randomDigits = getRandomDigits(6);
    const user = await new User({
      email: `user-${randomDigits}@guest.com`,
      uuid: uuid,
      isGuestMode: true,
    });
    const users = await user.save();
    if (!users) throw new Error("User not Created");

    const userList = await UserListSchema.findOne({
      userUuid: user.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: user.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreatedGuest",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });

    // res.status(200).json({ ...user._doc, token });
    res.cookie("uuid", uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    // res.json({ message: "Successful" });
    res.status(200).json({ ...user._doc, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while createGuestMode Auth: ${error.message}`,
    });
  }
};

const signUpGuestMode = async (req, res) => {
  try {
    const alreadyUser = await User.findOne({ email: req.body.email });
    if (alreadyUser) throw new Error("Email Already Exists");
    const guestUserMode = await User.findOne({ uuid: req.body.uuid });
    if (!guestUserMode) {
      await signUpUser(req, res); //Do a regular signup if user not found
      return;
    }

    const checkGoogleEmail = await isGoogleEmail(req.body.email);
    if (checkGoogleEmail)
      throw new Error(
        "We have detected that this is a Google hosted e-mail-For greater security,please use 'Continue with Google'"
      );

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    const user = await User.updateOne(
      { uuid: req.body.uuid },
      {
        $set: {
          email: req.body.email,
          password: hashPassword,
          role: "user",
          isGuestMode: false,
        },
      }
    );

    const userList = await UserListSchema.findOne({
      userUuid: req.body.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: req.body.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: req.body.uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Generate a JWT token
    // const token = createToken({ uuid: req.body.uuid });

    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: req.body.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.uuid,
    });

    await sendVerifyEmailGuest(req, res);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpGuestMode Auth: ${error.message}`,
    });
  }
};

const signUpSocialGuestMode = async (req, res) => {
  try {
    const payload = req.body;

    // Check if email already exist
    const AlreadyUser = await User.findOne({ email: payload.email });
    if (AlreadyUser) throw new Error("Email Already Exist");

    //if user doesnot exist
    const user = await User.findOne({ uuid: payload.uuid });
    if (!user) {
      await signUpUserBySocialLogin(req, res);
      return;
    }

    const uuid = payload.uuid;
    await User.updateOne(
      { uuid: uuid },
      {
        $set: {
          email: payload.email,
          role: "user",
          isGuestMode: false,
        },
      }
    );
    const updatedUser = await User.findOne({ uuid: payload.uuid });
    // Check Email Category
    const emailStatus = await eduEmailCheck(req, res, payload.email);
    let type = "";
    if (emailStatus.status === "OK") type = "Education";

    // Create a Badge at starting index
    updatedUser.badges.unshift({
      accountId: payload.sub,
      accountName: payload.provider,
      details: encryptData(payload),
      isVerified: true,
      type: type,
    });

    // Update user verification status to true
    updatedUser.gmailVerified = payload.email_verified;
    await updatedUser.save();

    const userList = await UserListSchema.findOne({
      userUuid: updatedUser.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: updatedUser.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await updatedUser.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    // Create Ledger
    await createLedger({
      uuid: updatedUser.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: updatedUser.uuid,
      // txDescription : "user logs in"
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: updatedUser.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      // txData : user.badges[0]._id,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: updatedUser.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    if (updatedUser.badges[0].type !== "Education") {
      updatedUser.requiredAction = true;
      await updatedUser.save();
    }

    // Decrypt Saved Data
    const decryptUser = updatedUser._doc;
    decryptUser.badges[0].details = decryptData(decryptUser.badges[0].details);

    res.cookie("uuid", updatedUser.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpSocialGuestMode Auth: ${error.message}`,
    });
  }
};

const signUpGuestBySocialBadges = async (req, res) => {
  try {
    const payload = req.body;

    let id;
    let type;
    if (payload.type === "facebook") {
      id = payload.data.id;
      type = payload.type;
    }

    if (payload.type === "twitter") {
      id = payload.data.user.uid;
      type = payload.type;
    }

    if (payload.type === "github") {
      id = payload.data.user.uid;
      type = payload.type;
    }

    if (payload.type === "instagram") {
      id = payload.data.user_id;
      type = payload.type;
    }

    if (payload.provider === "linkedin") {
      id = payload.data.sub;
      type = payload.type;
    }

    const usersWithBadge = await User.find({
      badges: {
        $elemMatch: {
          accountId: id,
          accountName: type,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    //if user doesnot exist
    const user = await User.findOne({ uuid: payload.data.uuid });
    if (!user) {
      await signUpUserBySocialBadges(req, res);
      return;
    }

    const uuid = payload.data.uuid;
    await User.updateOne(
      { uuid: uuid },
      {
        $set: {
          email: payload.email ? payload.email : null,
          role: "user",
          isGuestMode: false,
        },
      }
    );

    // Create a Badge at starting index
    user.badges.unshift({
      accountId: id,
      accountName: payload.type,
      details: encryptData(payload.data),
      isVerified: true,
      type: "social",
      primary: true,
    });

    // Update user verification status to true
    await user.save();

    const userList = await UserListSchema.findOne({
      userUuid: user.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: user.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      // txData : user.badges[0]._id,
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

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Decrypt Saved Data
    const decryptUser = user._doc;
    decryptUser.badges[0].details = decryptData(decryptUser.badges[0].details);

    res.cookie("uuid", user.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpSocialGuestMode Auth: ${error.message}`,
    });
  }
};

const signInUserBySocialLogin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.data.email });
    if (!user) throw new Error("User not Found");

    // Check Google Account
    const payload = req.body.data;
    // Check if email already exist
    const alreadyUser = await User.findOne({ email: payload.email });
    if (!alreadyUser) throw new Error("Please Signup!");

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });

    if (user.isPasswordEncryption) {
      res.cookie("uuid", user.uuid, cookieConfiguration());
      res.cookie("jwt", token, cookieConfiguration());
      res.status(200).json({ ...user._doc, token, isPasswordEncryption: true });
    } else {
      user.badges.forEach((badge) => {
        if (badge.legacy || badge.accountName === "Email") {
          return;
        }
        const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
        const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
        if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
          if (badge.data) {
            badge.data = decryptData(badge.data);
          }
          else if (badge.details) {
            badge.details = decryptData(badge.details);
          }
          else {
            throw new Error("Neither Badge Details nor Data is found");
          }
        }
        if (badge.personal && badge.personal.work) {
          badge.personal.work = badge.personal.work.map(decryptData);
        } else if (badge.personal) {
          badge.personal = Object.fromEntries(
            Object.entries(badge.personal).map(([key, value]) =>
              [key, decryptData(value)]
            )
          );
        }
        if (badge.web3) {
          badge.web3 = decryptData(badge.web3);
        }
      });
      res.cookie("uuid", user.uuid, cookieConfiguration());
      res.cookie("jwt", token, cookieConfiguration());
      res.status(200).json({ ...user._doc, token });
    }
    // res.status(201).send("Signed in Successfully");
    // if(req.query.GoogleAccount){
    //   signUpUserBySocialLogin(req, res)
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};

const signInUserBySocialBadges = async (req, res) => {
  try {
    let id;
    const payload = req.body;
    if (payload.type === "facebook") {
      id = payload.data.id;
    }

    if (payload.type === "twitter") {
      id = payload.data.user.uid;
    }

    if (payload.type === "github") {
      id = payload.data.user.uid;
    }

    if (payload.type === "instagram") {
      id = payload.data.user_id;
    }
    if (payload.type === "linkedin") {
      id = payload.data.sub;
    }

    const user = await User.findOne({ "badges.0.accountId": id });
    if (!user) throw new Error("User not Found");

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountLogin",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.uuid,
      // txDescription : "user logs in"
    });

    // // Decrypt Saved Data
    // const decryptUser = user._doc;
    // decryptUser.badges[0].details = decryptData(decryptUser.badges[0].details);

    // res.status(200).json(user);
    if (user.isPasswordEncryption) {
      res.cookie("uuid", user.uuid, cookieConfiguration());
      res.cookie("jwt", token, cookieConfiguration());
      res.status(200).json({ ...user._doc, token, isPasswordEncryption: true });
    } else {
      user.badges.forEach((badge) => {
        if (badge.legacy || badge.accountName === "Email") {
          return;
        }
        const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
        const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
        if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
          if (badge.data) {
            badge.data = decryptData(badge.data);
          }
          else if (badge.details) {
            badge.details = decryptData(badge.details);
          }
          else {
            throw new Error("Neither Badge Details nor Data is found");
          }
        }
        if (badge.personal && badge.personal.work) {
          badge.personal.work = badge.personal.work.map(decryptData);
        } else if (badge.personal) {
          badge.personal = Object.fromEntries(
            Object.entries(badge.personal).map(([key, value]) =>
              [key, decryptData(value)]
            )
          );
        }
        if (badge.web3) {
          badge.web3 = decryptData(badge.web3);
        }
      });
      res.cookie("uuid", user.uuid, cookieConfiguration());
      res.cookie("jwt", token, cookieConfiguration());
      res.status(200).json({ ...user._doc, token });
    }
    // res.status(201).send("Signed in Successfully");
    // if(req.query.GoogleAccount){
    //   signUpUserBySocialLogin(req, res)
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};

const updateUserSettings = async (req, res) => {
  try {
    // Find the user by uuid
    let user = await User.findOne({ uuid: req.body.uuid });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user settings
    user.userSettings.darkMode = req.body.darkMode;
    user.userSettings.defaultSort = req.body.defaultSort;
    user.notificationSettings.systemNotifications =
      req.body.systemNotifications;
    user.notificationSettings.emailNotifications = req.body.emailNotifications;
    await user.save();

    // Respond with updated user settings
    res.status(200).json({
      message: {
        userSettings: user.userSettings,
        notificationSettings: user.notificationSettings,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while updating user settings: ${error.message}`,
    });
  }
};

// const userInfo = async (req, res) => {
//   try {
//     const password = req.query.infoc;

//     const user = await User.findOne({
//       uuid: req.params.userUuid,
//     });
//     // Check if user exists
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.isPasswordEncryption) {
//       if (!password)
//         throw new Error(
//           "No Password Provided in request body, Request can't be proceeded."
//         );
//       user.badges.forEach((badge) => {
//         if (badge.legacy || badge.accountName === "Email") {
//           console.log("Email");
//           return;
//         } else if (badge.type && badge.type === "cell-phone") {
//           badge.details = userCustomizedDecryptData(badge.details, password);
//         } else if (
//           badge.type &&
//           ["work", "education", "personal", "social", "default"].includes(
//             badge.type
//           )
//         ) {
//           badge.details = userCustomizedDecryptData(badge.details, password);
//         } else if (
//           badge.accountName &&
//           [
//             "facebook",
//             "linkedin",
//             "twitter",
//             "instagram",
//             "github",
//             "Email",
//             "google",
//           ].includes(badge.accountName)
//         ) {
//           badge.details = userCustomizedDecryptData(badge.details, password);
//         } else if (badge.personal && badge.personal.work) {
//           badge.personal.work = badge.personal.work.map((item) => {
//             return userCustomizedDecryptData(item, password);
//           });
//         } else if (badge.personal) {
//           const decryptedPersonal = {};
//           for (const key of personalKeys) {
//             if (badge.personal.hasOwnProperty(key)) {
//               decryptedPersonal[key] = userCustomizedDecryptData(
//                 badge.personal[key],
//                 password
//               );
//             }
//           }
//           badge.personal = decryptedPersonal;
//         } else if (badge.web3) {
//           badge.web3 = userCustomizedDecryptData(badge.web3, password);
//         } else if (
//           badge.type &&
//           ["desktop", "mobile", "farcaster"].includes(badge.type)
//         ) {
//           badge.data = userCustomizedDecryptData(badge.data, password);
//         }
//       });
//     }

//     // Decrypt the 'personal' field or the 'work' array in each badge
//     user.badges.forEach((badge) => {
//       if (badge.legacy || badge.accountName === "Email") {
//         return;
//       } else if (badge.type && badge.type === "cell-phone") {
//         console.log("I am AT Cell-Phone------------------------");
//         badge.details = decryptData(badge.details);
//       } else if (
//         badge.type &&
//         ["work", "education", "personal", "social", "default"].includes(
//           badge.type
//         )
//       ) {
//         console.log("I am AT TYPE------------------------");
//         badge.details = decryptData(badge.details);
//       } else if (
//         badge.accountName &&
//         [
//           "facebook",
//           "linkedin",
//           "twitter",
//           "instagram",
//           "github",
//           "Email",
//           "google",
//         ].includes(badge.accountName)
//       ) {
//         console.log("I am AT Acc-Name------------------------");
//         badge.details = decryptData(badge.details);
//       } else if (badge.personal && badge.personal.work) {
//         console.log("I am AT Personal Work------------------------");
//         badge.personal.work = badge.personal.work.map((encryptedData) => {
//           return decryptData(encryptedData);
//         });
//       } else if (badge.personal) {
//         console.log("I am AT Personal------------------------");
//         // Decrypt each key in the personal object if it matches one of the personalKeys
//         const decryptedPersonal = {};
//         for (const key of personalKeys) {
//           if (badge.personal.hasOwnProperty(key)) {
//             decryptedPersonal[key] = decryptData(badge.personal[key]);
//           }
//         }

//         badge.personal = decryptedPersonal;
//       } else if (badge.web3) {
//         console.log("I am AT WEB3------------------------");
//         badge.web3 = decryptData(badge.web3);
//       } else if (
//         badge.type &&
//         ["desktop", "mobile", "farcaster"].includes(badge.type)
//       ) {
//         console.log("I am AT Passkey------------------------");
//         badge.data = decryptData(badge.data);
//       }
//     });

//     const sharedQuests = await UserQuestSetting.find({ uuid: req.params.userUuid })
//     const totals = sharedQuests.reduce((acc, quest) => {
//       acc.questImpression += quest.questImpression || 0;
//       acc.questsCompleted += quest.questsCompleted || 0;
//       return acc;
//     }, { questImpression: 0, questsCompleted: 0 });

//     const questsIds = await InfoQuestQuestions.find({ uuid: req.params.userUuid })
//     const questsIdsArray = questsIds.map(doc => doc._id);

//     // Other Hiding Our Quests Count
//     const result = await UserQuestSetting.aggregate([
//       {
//         $match: {
//           hidden: true,
//           questForeignKey: { $in: questsIdsArray }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalCount: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           totalCount: 1
//         }
//       }
//     ]);
//     const otherHidingOurQuestsCount = result.length > 0 ? result[0].totalCount : 0;

//     // Initialize a set to track unique hidden messages
//     const uniqueHiddenMessages = new Set();
//     for (const questId of questsIdsArray) {
//       // Find all UserQuestSetting documents with the current questId
//       const userQuestSettings = await UserQuestSetting.find({ questForeignKey: questId });
//       // Use a set to track hiddenMessages within the current questId
//       const hiddenMessagesSet = new Set();
//       for (const setting of userQuestSettings) {
//         hiddenMessagesSet.add(setting.hiddenMessage);
//       }
//       // Add the unique hidden messages to the overall set
//       hiddenMessagesSet.forEach(hiddenMessage => uniqueHiddenMessages.add(hiddenMessage));
//     }
//     // The size of the set gives the count of unique hidden messages
//     const suppressQuestsCount = uniqueHiddenMessages.size;

//     const resUser = {
//       ...user._doc,
//       sharedQuestsStatistics: {
//         sharedQuests: sharedQuests.length,
//         totalQuestsImpression: totals.questImpression,
//         totalQuestsCompleted: totals.questsCompleted
//       },
//       feedBackQuestsStatistics: {
//         otherHidingOurQuestsCount: otherHidingOurQuestsCount,
//         suppressQuestsCount: suppressQuestsCount
//       },
//       questsActivity: {
//         myHiddenQuestsCount: await UserQuestSetting.countDocuments({
//           hidden: true,
//           uuid: req.params.userUuid
//         }),
//         myCreatedQuestsCouont: await InfoQuestQuestions.countDocuments({
//           uuid: req.params.userUuid
//         }),
//         myQuestsEngagementCount: await StartQuests.countDocuments({
//           uuid: req.params.userUuid
//         }),
//       }
//     }
//     res.status(200).json(resUser);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({
//       message: `An error occurred while processing userInfo: ${error.message}`,
//     });
//   }
// };

const userInfo = async (req, res) => {
  try {
    const password = req.query.infoc;
    const userUuid = req.params.userUuid;

    const user = await User.findOne({ uuid: userUuid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isPasswordEncryption) {
      if (!password) throw new Error("No Password Provided in request body, Request can't be proceeded.");

      user.badges.forEach((badge) => {
        if (badge.legacy || badge.accountName === "Email") {
          return;
        }
        const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
        const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
        if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
          if (badge.data) {
            badge.data = userCustomizedDecryptData(badge.data, password);
          }
          else if (badge.details) {
            badge.details = userCustomizedDecryptData(badge.details, password);
          }
          else {
            throw new Error("Neither Badge Details nor Data is found");
          }
        }
        if (badge.personal && badge.personal.work) {
          badge.personal.work = badge.personal.work.map((item) => userCustomizedDecryptData(item, password));
        } else if (badge.personal) {
          badge.personal = Object.fromEntries(
            Object.entries(badge.personal).map(([key, value]) =>
              [key, userCustomizedDecryptData(value, password)]
            )
          );
        }
        if (badge.web3) {
          badge.web3 = userCustomizedDecryptData(badge.web3, password);
        }
      });
    }

    user.badges.forEach((badge) => {
      if (badge.legacy || badge.accountName === "Email") {
        return;
      }
      const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
      const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
      if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
        if (badge.data) {
          badge.data = decryptData(badge.data);
        }
        else if (badge.details) {
          badge.details = decryptData(badge.details);
        }
        else {
          throw new Error("Neither Badge Details nor Data is found");
        }
      }
      if (badge.personal && badge.personal.work) {
        badge.personal.work = badge.personal.work.map(decryptData);
      } else if (badge.personal) {
        badge.personal = Object.fromEntries(
          Object.entries(badge.personal).map(([key, value]) =>
            [key, decryptData(value)]
          )
        );
      }
      if (badge.web3) {
        badge.web3 = decryptData(badge.web3);
      }
    });

    const sharedQuests = await UserQuestSetting.find({ uuid: userUuid });
    const totals = sharedQuests.reduce((acc, quest) => {
      acc.questImpression += quest.questImpression || 0;
      acc.questsCompleted += quest.questsCompleted || 0;
      return acc;
    }, { questImpression: 0, questsCompleted: 0 });

    const questsIds = await InfoQuestQuestions.find({ uuid: userUuid }, { _id: 1 });
    const questsIdsArray = questsIds.map(doc => doc._id);

    const result = await UserQuestSetting.aggregate([
      { $match: { hidden: true, questForeignKey: { $in: questsIdsArray } } },
      { $group: { _id: null, totalCount: { $sum: 1 } } },
      { $project: { _id: 0, totalCount: 1 } }
    ]);

    const otherHidingOurQuestsCount = result.length > 0 ? result[0].totalCount : 0;

    const uniqueHiddenMessages = new Set();
    for (const questId of questsIdsArray) {
      const userQuestSettings = await UserQuestSetting.find({ questForeignKey: questId });
      userQuestSettings.forEach(setting => uniqueHiddenMessages.add(setting.hiddenMessage));
    }
    const suppressQuestsCount = uniqueHiddenMessages.size;

    const resUser = {
      ...user._doc,
      sharedQuestsStatistics: {
        sharedQuests: sharedQuests.length,
        totalQuestsImpression: totals.questImpression,
        totalQuestsCompleted: totals.questsCompleted
      },
      feedBackQuestsStatistics: {
        otherHidingOurQuestsCount: otherHidingOurQuestsCount,
        suppressQuestsCount: suppressQuestsCount
      },
      questsActivity: {
        myHiddenQuestsCount: await UserQuestSetting.countDocuments({ hidden: true, uuid: userUuid }),
        myCreatedQuestsCount: await InfoQuestQuestions.countDocuments({ uuid: userUuid }),
        myQuestsEngagementCount: await StartQuests.countDocuments({ uuid: userUuid })
      }
    };

    res.status(200).json(resUser);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: `An error occurred while processing userInfo: ${error.message}` });
  }
};

const runtimeSignInPassword = async (req, res) => {
  try {
    const infoc = req.body.infoc;
    const hash = crypto.createHash("sha256").update(infoc).digest("hex");

    const password = hash;

    const user = await User.findOne({
      uuid: req.body.userUuid,
    });
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isPasswordEncryption) {
      if (!password) throw new Error("No Password Provided in request body, Request can't be proceeded.");

      user.badges.forEach((badge) => {
        if (badge.legacy || badge.accountName === "Email") {
          return;
        }
        const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
        const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
        if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
          if (badge.data) {
            badge.data = userCustomizedDecryptData(badge.data, password);
          }
          else if (badge.details) {
            badge.details = userCustomizedDecryptData(badge.details, password);
          }
          else {
            throw new Error("Neither Badge Details nor Data is found");
          }
        }
        if (badge.personal && badge.personal.work) {
          badge.personal.work = badge.personal.work.map((item) => userCustomizedDecryptData(item, password));
        } else if (badge.personal) {
          badge.personal = Object.fromEntries(
            Object.entries(badge.personal).map(([key, value]) =>
              [key, userCustomizedDecryptData(value, password)]
            )
          );
        }
        if (badge.web3) {
          badge.web3 = userCustomizedDecryptData(badge.web3, password);
        }
      });
    }

    // Decrypt the 'personal' field or the 'work' array in each badge
    user.badges.forEach((badge) => {
      if (badge.legacy || badge.accountName === "Email") {
        return;
      }
      const typesToDecrypt = ["cell-phone", "work", "education", "personal", "social", "default", "desktop", "mobile", "farcaster"];
      const accountsToDecrypt = ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"];
      if (typesToDecrypt.includes(badge.type) || accountsToDecrypt.includes(badge.accountName)) {
        badge.details = decryptData(badge.details);
      }
      if (badge.personal && badge.personal.work) {
        badge.personal.work = badge.personal.work.map(decryptData);
      } else if (badge.personal) {
        badge.personal = Object.fromEntries(
          Object.entries(badge.personal).map(([key, value]) =>
            [key, decryptData(value)]
          )
        );
      }
      if (badge.web3) {
        badge.web3 = decryptData(badge.web3);
      }
    });

    res.status(200).json({ user: user, hash: hash });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `Wrong Password: ${error.message}`,
    });
  }
};

const infoc = async (req, res) => {
  try {
    const infoc = req.body.infoc;
    const hash = crypto.createHash("sha256").update(infoc).digest("hex");
    res.status(200).json({
      message: "Success",
      data: hash,
    });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while infoc: ${error.message}`,
    });
  }
};

const userInfoById = async (req, res) => {
  try {
    const user = await User.findOne({ uuid: req.body.uuid });

    // Generate a JWT token
    const token = createToken({ uuid: req.body.uuid });

    res.cookie("uuid", req.body.uuid, cookieConfiguration());
    res.cookie("jwt", token, cookieConfiguration());
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while userInfoById Auth: ${error.message}`,
    });
  }
};

const setUserWallet = async (req, res) => {
  try {
    // Load the document
    const doc = await User.findOne({ uuid: req.body.uuid });

    // Update the document using `Document#updateOne()`
    // Equivalent to `CharacterModel.updateOne({ _id: doc._id }, update)`
    const update = { walletAddr: req.body.walletAddr };
    await doc.updateOne(update);

    res.status(201).send("Wallet Updated");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while setUserWallet Auth: ${error.message}`,
    });
  }
};
const signedUuid = async (req, res) => {
  try {
    // Load the document
    const doc = await User.findOne({ uuid: req.body.uuid });

    // Update the document using `Document#updateOne()`
    // Equivalent to `CharacterModel.updateOne({ _id: doc._id }, update)`
    const update = { signedUuid: req.body.signedUuid, metamaskVerified: true };
    await doc.updateOne(update);

    res.status(201).send("Updated");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signedUuid Auth: ${error.message}`,
    });
  }
};

const sendVerifyEmailGuest = async (req, res) => {
  try {
    const verificationTokenFull = jwt.sign(
      { uuid: req.body.uuid },
      JWT_SECRET,
      {
        expiresIn: "2m",
      }
    );
    const verificationToken = verificationTokenFull.substr(
      verificationTokenFull.length - 6
    );

    // Step 3 - Email the user a unique verification link
    const url = `${FRONTEND_URL}/VerifyCode/?${verificationTokenFull}`;
    // return res.status(200).json({ url });

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
        ToAddresses: [req.body.email],
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
      const res = await sesClient.sendEmail(params).promise();
      //console.log("Email has been sent!", res);
    } catch (error) {
      //console.log(error);
    }

    return res.status(200).send({
      message: `Sent a verification email to ${req.body.email}`,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while sendVerifyEmail Auth: ${error.message}`,
    });
  }
};

const sendVerifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    //console.log("user", user);
    !user && res.status(404).json("User not Found");

    // const verificationTokenFull = jwt.sign({ ID: user._id }, JWT_SECRET, {
    //   expiresIn: "10m",
    // });
    const verificationTokenFull = jwt.sign({ uuid: user.uuid }, JWT_SECRET, {
      expiresIn: "2m",
    });
    const verificationToken = verificationTokenFull.substr(
      verificationTokenFull.length - 6
    );

    // const verificationToken = user.generateVerificationToken();
    //console.log("verificationToken", verificationToken);

    // Step 3 - Email the user a unique verification link
    const url = `${FRONTEND_URL}/VerifyCode/?${verificationTokenFull}`;
    // return res.status(200).json({ url });
    // //console.log("url", url);

    // NODEMAILER
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.EMAIL_USERNAME,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });

    // var mailOptions = {
    //   from: process.env.EMAIL_USERNAME,
    //   to: req.body.email,
    //   //   to: "abdullahyaqoob380@gmail.com",
    //   subject: "Verify Account",
    //   html: `Click <a href = '${url}'>here</a> to confirm your email <br /> <br /> <br />
    //       And confirm this code <b>${verificationToken}</b> from the App`,
    //   //   html: `Please Copy the code and Paste in App <b>${verificationToken}</b>`,
    // };

    // await transporter.sendMail(mailOptions, function (error, info) {
    //   if (error) {
    //     //console.log(error);
    //   } else {
    //     //console.log("email sent: " + info.response);
    //   }
    // });
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
        ToAddresses: [req.body.email],
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
      const res = await sesClient.sendEmail(params).promise();
      //console.log("Email has been sent!", res);
    } catch (error) {
      //console.log(error);
    }

    return res.status(200).send({
      message: `Sent a verification email to ${req.body.email}`,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while sendVerifyEmail Auth: ${error.message}`,
    });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const response = await sendEmailMessage(
      req.body.email,
      subject,
      message,
      req.body.sender
    );
    if (response) {
      res.status(200).json({ message: `Email Sent Successfully!` });
    }
  } catch (error) {
    //console.log(error);
    res.status(500).json({
      message: `An error occurred while sendVerifyEmail Auth: ${error.message}`,
    });
  }
};

// const verifyReferralCode = async(req, res) => {
//   try {
//     const referralCode = "Jan2024";
//     const { code, uuid } = req.body;

//     // const user = User.
//     const user = await User.findOne({ uuid });
//     if (!user) throw new Error("User Not Exist");

//     if(code !== referralCode) throw new Error("Referral code not exist!");

//     // Generate a token
//     const token = createToken({ uuid: user.uuid });

//     res.cookie("uuid", user.uuid, cookieConfiguration());
//     res.cookie("jwt", token, cookieConfiguration());
//     user.referral = true;
//     await user.save();
//     res.json({ message: "Successful" });
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while verifyReferralCode Auth: ${error.message}`,
//     });
//   }
// };

const verifyReferralCode = async (req, res) => {
  try {
    const referralCode = "Jan2024";
    const { code } = req.body;
    if (code !== referralCode) throw new Error("Referral code not exist!");
    // Generate a token
    res.json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while verifyReferralCode Auth: ${error.message}`,
    });
  }
};

const AuthenticateJWT = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ uuid: decodedToken.uuid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verification) {
      return res.status(409).json({ message: "Already Verified" });
    }
    return res.status(200).json({ message: "Continue" });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const verify = async (req, res) => {
  const verificationCode = req.body.verificationCode;
  const token = req._parsedUrl.query;

  if (verificationCode !== token.substr(token.length - 6)) {
    return res.status(422).send({
      message: "Invalid Verification Code",
    });
  }

  // Check we have an id
  if (!token) {
    return res.status(422).send({
      message: "Missing Token",
    });
  }

  // Step 1 -  Verify the token from the URL
  // let payload = null;
  // try {
  //   payload = jwt.verify(token, process.env.USER_VERIFICATION_TOKEN_SECRET);
  // } catch (error) {
  //   console.error(error.message);
  //   res.status(500).json({
  //     message: `An error occurred while verify Auth: ${error.message}`,
  //   });
  // }

  try {
    // Step 2 - Find user with matching ID
    const user = await User.findOne({ uuid: req.user.uuid }).exec();
    if (!user) {
      return res.status(404).send({
        message: "User does not exists",
      });
    }

    // Create a Badge
    user.badges.unshift({
      accountId: user.email,
      accountName: "Email",
      isVerified: true,
    });
    // Step 3 - Update user verification status to true
    user.requiredAction = true;
    user.gmailVerified = true;
    user.verification = true;
    await user.save();
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: user.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: user.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      // txData : user.badges[0]._id,
      // txDescription : "Incentive for adding badges"
    });
    //
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: user.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });
    // return res.status(200).send({
    //   message: "Gmail Account verified",
    //   uuid: req.user.uuid,
    // });
    user.verification = true;
    await user.save();
    // Generate a token
    const generateToken = createToken({ uuid: req.user.uuid });

    res.cookie("uuid", req.user.uuid, cookieConfiguration());
    res.cookie("jwt", generateToken, cookieConfiguration());
    res.status(200).json({ ...user._doc, token: generateToken });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while signUpUser Auth: ${error.message}`,
    });
  }
};
const deleteByUUID = async (req, res) => {
  try {
    const { uuid } = req.params;
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountDeleted",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User deletes account"
    });
    const userBalance = await getUserBalance(uuid);
    if (userBalance > 0) {
      // Increment the Treasury
      await updateTreasury({ amount: userBalance, inc: true });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid,
        amount: QUEST_CREATED_AMOUNT,
        dec: true,
      });
    }
    await User.deleteOne({ uuid });
    res.status(201).send("User has been deleted");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while deleteByUUID Auth: ${error.message}`,
    });
  }
};
const logout = async (req, res) => {
  try {
    const uuid = req.cookies.uuid;

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountLogout",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User logs out"
    });

    // Clear cookies and respond to the client
    res.clearCookie("uuid", cookieConfiguration());
    res.clearCookie("jwt", cookieConfiguration());
    res.status(200).json({ message: "User has been logout successfully!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while logout Auth: ${error.message}`,
    });
  }
};

const setStates = async (req, res) => {
  try {
    const uuid = req.cookies.uuid;
    const updatedUser = await User.findOneAndUpdate(
      { uuid: uuid },
      {
        $set: {
          "States.expandedView": req.body.expandedView,
          "States.searchData": req.body.searchData,
          "States.filterByStatus": req.body.filterByStatus,
          "States.filterByType": req.body.filterByType,
          "States.filterByScope": req.body.filterByScope,
          "States.filterBySort": req.body.filterBySort,
          "States.topics": req.body.topics,
          "States.lightMode": req.body.LightMode,
          "States.moderationRatingFilter": req.body.moderationRatingFilter,
          "States.selectedBtnId": req.body.selectedBtnId,
          "States.bookmarks": req.body.bookmarks,
          "States.filterByMedia": req.body.filterByMedia,
        },
      },
      { new: true }
    );

    res.status(200).json({ message: "Filters Updated", updatedUser });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while setting filters: ${error.message}`,
    });
  }
};

const setBookmarkStates = async (req, res) => {
  try {
    const uuid = req.cookies.uuid;
    const updatedUser = await User.findOneAndUpdate(
      { uuid: uuid },
      {
        $set: {
          "bookmarkStates.expandedView": req.body.expandedView,
          "bookmarkStates.searchData": req.body.searchData,
          "bookmarkStates.filterByStatus": req.body.filterByStatus,
          "bookmarkStates.filterByType": req.body.filterByType,
          "bookmarkStates.filterByScope": req.body.filterByScope,
          "bookmarkStates.filterBySort": req.body.filterBySort,
          "bookmarkStates.columns": req.body.columns,
          "bookmarkStates.lightMode": req.body.LightMode,
          "bookmarkStates.moderationRatingFilter":
            req.body.moderationRatingFilter,
        },
      },
      { new: true }
    );

    res.status(200).json({ message: "Filters Updated", updatedUser });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while setting filters: ${error.message}`,
    });
  }
};

const getInstaToken = async (req, res) => {
  try {
    const clientId = req.body.clientId;
    const clientSecret = req.body.clientSecret;
    const redirectUri = req.body.redirectUri;
    const code = req.body.code;

    //console.log("Request Body:", req.body);

    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    // //console.log("token", response.data.access_token, response.data.user_id);

    // const data = await axios.get(
    //   `https://graph.facebook.com/v3.2/${response.data.user_id}?fields=business_discovery.username(bluebottle){followers_count,media_count}&access_token=${response.data.access_token}`
    // );

    // //console.log("Instagram API Response 2:", data);
    // //console.log("Instagram API Response 1:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(error.response ? error.response.status : 500)
      .json({ error: error.message });
  }
};

const deleteBadgeById = async (req, res) => {
  try {
    const { uuid, id } = req.params;
    const user = await User.findOne({ uuid });
    !user && res.status(404).json("User not Found");
    const updatedBadges = user.badges.filter((item) => item._id === id);
    user.badges = updatedBadges;
    await user.save();
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User removes a verification badge"
    });

    res.status(201).send("User has been deleted");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: `An error occurred while deleteBadgeById Auth: ${error.message}`,
    });
  }
};

const getLinkedInUserInfo = async (req, res) => {
  try {
    const { code, grant_type, redirect_uri, client_id, client_secret } =
      req.body;

    //console.log("Request Body getLinkedInUserInfo:", req.body);
    const params = new URLSearchParams();
    params.append("grant_type", grant_type);
    params.append("code", code);
    params.append("client_id", client_id);
    params.append("client_secret", client_secret);
    params.append("redirect_uri", redirect_uri);
    //console.log("🚀 ~ getLinkedInUserInfo ~ params:", params);
    // First Axios request to get the access token
    const getAccessToken = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000, // Set timeout to 10 seconds (adjust as needed)
      }
    );
    //console.log("🚀 ~ getLinkedInUserInfo ~ getAccessToken:",getAccessToken.data);
    if (!getAccessToken.data.access_token) throw new Error("Token not found!");
    // if token found
    // // Second Axios request to get user info using the access token
    const response = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${getAccessToken.data.access_token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000, // Set timeout to 10 seconds (adjust as needed)
    });
    if (!response.data) throw new Error("No Data Found");
    //console.log("LinkedIn API Response:", response.data);
    res.status(200).send(response.data);
  } catch (error) {
    // console.error('Error:', error);
    return error.message;
  }
};

const getFacebookUserInfo = async (req, res) => {
  try {
    const { code, redirect_uri, client_id } = req.body;
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", client_id);
    params.append("redirect_uri", redirect_uri);
    params.append("client_secret", "5a6af75fdb11fa22c911e57ae0d374df");
    // //console.log("🚀 ~ getFacebookUserInfo ~ params:", params);
    // First Axios request to get the access token
    const responseAccessToken = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${client_id}&redirect_uri=${redirect_uri}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // Set timeout to 10 seconds (adjust as needed)
      }
    );
    // console.log("Response Token Via Facebook: ", responseAccessToken);
    if (!responseAccessToken.data.access_token)
      throw new Error("Token not found!");
    // if token found
    // // Second Axios request to get user info using the access token
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me?access_token=${responseAccessToken.data.access_token
      }&fields=${"id,first_name,last_name,middle_name,name,name_format,picture,short_name,email,gender,age_range,friends,link,birthday"}`,
      {
        // headers: {
        //   Authorization: `Bearer ${responseAccessToken.data.access_token}`,
        //   "Content-Type": "application/json",
        // },
        timeout: 10000, // Set timeout to 10 seconds (adjust as needed)
      }
    );
    if (!response.data) throw new Error("No Data Found");
    console.log("LinkedIn API Response:", response.data);
    res.status(200).send(response.data);
  } catch (error) {
    console.error("Error:", error);
    return error.message;
  }
};

module.exports = {
  changePassword,
  signUpUser,
  signUpUserBySocialLogin,
  signInUser,
  createGuestMode,
  signUpGuestMode,
  signUpSocialGuestMode,
  signInUserBySocialLogin,
  userInfo,
  runtimeSignInPassword,
  infoc,
  setUserWallet,
  signedUuid,
  sendVerifyEmail,
  sendEmail,
  verify,
  verifyReferralCode,
  deleteByUUID,
  logout,
  setStates,
  setBookmarkStates,
  deleteBadgeById,
  userInfoById,
  AuthenticateJWT,
  getInstaToken,
  getLinkedInUserInfo,
  getFacebookUserInfo,
  updateUserSettings,
  signUpUserBySocialBadges,
  signUpGuestBySocialBadges,
  signInUserBySocialBadges,
};
