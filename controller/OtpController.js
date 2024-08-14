const Otp = require("../models/Otp");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const User = require("../models/UserModel");
const { addContactBadge } = require("../controller/BadgeController");
const AWS = require("aws-sdk");
const { createToken, cookieConfiguration } = require("../service/auth");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { userInfo } = require("./AuthController");
const { ACCOUNT_BADGE_ADDED_AMOUNT } = require("../constants");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices");


// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sns = new SNSClient({
  region: process.env.AWS_SNS_REGION, // AWS region from environment variables
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY, // AWS access key from environment variables
    secretAccessKey: process.env.AWS_SNS_SECRET_KEY, // AWS secret key from environment variables
  },
});

const SES_CONFIG = {
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const sendOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  const generatedOtp = generateOTP();
  const params = {
    Message: `Your OTP code is: ${generatedOtp}`, // Generate a 6-digit OTP code
    PhoneNumber: phoneNumber, // Recipient's phone number from environment variables
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "String",
      },
    },
  };
  try {
    // Send OTP via SNS
    // Create a new PublishCommand with the specified parameters
    const command = new PublishCommand(params);
    // Send the SMS message using the SNS client and the created command
    const message = await sns.send(command);
    if (!message) throw new Error("OTP Failed!");

    // Save OTP to database
    const otp = await new Otp({ phoneNumber, otp: generatedOtp });
    const savedOtp = await otp.save();
    if (!savedOtp) throw new Error("OTP not saved!");

    res.status(200).json({ message: "OTP sent successfully", data: savedOtp });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while sendOtp: ${error.message}`,
    });
  }
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  try {
    // Check OTP from database
    const savedOTP = await Otp.findOne({ phoneNumber })
      .sort({ createdAt: -1 })
      .exec();
    if (!savedOTP || savedOTP.otp !== otp) throw new Error("Invalid OTP");

    if (req.body.legacyEmail && req.body.userUuid) {
      const user = await User.findOne(
        {
          uuid: req.body.userUuid,
        }
      );
      user.role = "user",
      user.isGuestMode = false,
      user.ip = "",
      user.requiredAction = true,
      user.gmailVerified = true,
      user.verification = true,
      user.isLegacyEmailContactVerified = true,
      user.badges.unshift({
        accountId: user.email,
        accountName: "Email",
        isVerified: true,
      });
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
        txData: user.badges[0]?.accountName,
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
        txData: user.badges[0]?.accountName, // txDescription : "Incentive for adding badges"
      });

      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountLogin",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: user.badges[0]?.accountName, // txDescription : "user logs in"
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
      user.rewardSchedual.addingBadgeFdx = user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
      await user.save();

      // Generate a token
      const generateToken = createToken({ uuid: req.body.userUuid });

      res.cookie("uuid", req.body.userUuid, cookieConfiguration());
      res.cookie("jwt", generateToken, cookieConfiguration());
      res.status(200).json({ user: user, token: generateToken, isGoogleEmail: user.email.includes("@gmail.com") ? true : false, message: "OTP verification successful" });
    }
    else {
      res.status(200).json({ message: "OTP verification successful" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while verifyOtp: ${error.message}`,
    });
  }
};

const resendOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  const generatedOtp = generateOTP();
  const params = {
    Message: `Your OTP code is: ${generatedOtp}`, // Generate a 6-digit OTP code
    PhoneNumber: phoneNumber, // Recipient's phone number from environment variables
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "String",
      },
    },
  };
  try {
    // Check if OTP was sent within the last 60 seconds
    const lastSentTime = await Otp.findOne({ phoneNumber })
      .sort({ createdAt: -1 })
      .exec();
    if (lastSentTime && Date.now() - lastSentTime.createdAt.getTime() < 60000)
      throw new Error("You can only request OTP resend once per minute");

    // Send OTP via SNS
    // Create a new PublishCommand with the specified parameters
    const command = new PublishCommand(params);
    // Send the SMS message using the SNS client and the created command
    const message = await sns.send(command);
    if (!message) throw new Error("OTP Failed!");

    // Save OTP to database
    const otp = await new Otp({ phoneNumber, otp: generatedOtp });
    const savedOtp = await otp.save();
    if (!savedOtp) throw new Error("OTP not saved!");

    res
      .status(200)
      .json({ message: "OTP resent successfully", data: savedOtp });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while resendOtp: ${error.message}`,
    });
  }
};

const sendEmailOtp = async (req, res) => {
  const { email } = req.body;
  const generatedOtp = generateOTP();
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
          Data: `Here is your OTP: ${generatedOtp}`,
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
    const result = await sesClient.sendEmail(params).promise();
    if (!result) throw new Error("OTP Failed!");

    // Save OTP to database
    const otp = await new Otp({ email, otp: generatedOtp });
    const savedOtp = await otp.save();
    if (!savedOtp) throw new Error("OTP not saved!");

    res.status(200).json({ message: "OTP sent successfully", data: savedOtp });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while sendOtp: ${error.message}`,
    });
  }
};

const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Check OTP from database
    const savedOTP = await Otp.findOne({ email })
      .sort({ createdAt: -1 })
      .exec();
    if (!savedOTP || savedOTP.otp !== otp) throw new Error("Invalid OTP");

    const user = await User.findOne({ email: email });

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
    console.error(error);
    res.status(500).json({
      message: `An error occurred while verifyOtp: ${error.message}`,
    });
  }
};

const resendEmailOtp = async (req, res) => {
  const { email } = req.body;
  const generatedOtp = generateOTP();
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
          Data: `Here is your OTP: ${generatedOtp}`,
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
    // Check if OTP was sent within the last 60 seconds
    const lastSentTime = await Otp.findOne({ email })
      .sort({ createdAt: -1 })
      .exec();
    if (lastSentTime && Date.now() - lastSentTime.createdAt.getTime() < 60000)
      throw new Error("You can only request OTP resend once per minute");

    // Send OTP via SNS
    const result = await sesClient.sendEmail(params).promise();
    if (!result) throw new Error("OTP Failed!");

    // Save OTP to database
    const otp = await new Otp({ email, otp: generatedOtp });
    const savedOtp = await otp.save();
    if (!savedOtp) throw new Error("OTP not saved!");

    res
      .status(200)
      .json({ message: "OTP resent successfully", data: savedOtp });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while resendOtp: ${error.message}`,
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
};
