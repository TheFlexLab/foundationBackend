const Otp = require("../models/Otp");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const User = require("../models/UserModel");
const { addContactBadge } = require("../controller/BadgeController");
const AWS = require("aws-sdk");
const { createToken, cookieConfiguration } = require("../service/auth");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { userInfo } = require("./AuthController");

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

const addCellPhoneBadge = async (data) => { };

const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  try {
    // Check OTP from database
    const savedOTP = await Otp.findOne({ phoneNumber })
      .sort({ createdAt: -1 })
      .exec();
    if (!savedOTP || savedOTP.otp !== otp) throw new Error("Invalid OTP");

    if (req.body.legacyEmail && req.body.userUuid) {
      // const badge = {
      //   body: {
      //     uuid: req.body.userUuid,
      //     type: "cell-phone",
      //     data: phoneNumber,
      //     otp: true
      //   }
      // }
      // const otpBadge = await addContactBadge(badge);
      // if(!otpBadge) throw new Error("Can't add badge from OTP");
      await User.findOneAndUpdate(
        {
          uuid: req.body.userUuid,
        },
        {
          isLegacyEmailContactVerified: true,
        }
      ).exec();
      const request = {
        params: {
          userUuid: req.body.userUuid,
          otp: true,
        },
      };
      const user = await userInfo(request);

      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountLogin",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: user.badges[0]?.accountName,
      });

      return res
        .status(200)
        .json({ message: "OTP verification successful", user: user });
    }

    return res.status(200).json({ message: "OTP verification successful" });
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
