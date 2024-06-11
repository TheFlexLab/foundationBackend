const shortlink = require("shortlink");
const Redeem = require("../models/Redeem");
const UserModel = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const {
  updateUserBalance,
  getUserBalance,
} = require("../utils/userServices");
const crypto = require("crypto");

const create = async (req, res) => {
  try {
    const { creator, owner, uuid, amount, description, to, expiry, code } =
      req.body;
    // check user exist
    const User = await UserModel.findOne({ uuid });
    if (!User) throw new Error("No such User!");

    // check user balance
    const userBalance = await getUserBalance(req.body.uuid);
    if (userBalance <= amount)
      throw new Error("Your balance is insufficient to create this redemption");
    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "redemptionCreated",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: req.body.uuid,
      txTo: req.body.uuid,
      txAmount: amount,
      // txDescription : "User create redemption code"
      type: "redemption",
    });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: amount,
      dec: true,
    });
    User.fdxSpent = User.fdxSpent + amount;
    User.redemptionStatistics.myTotalRedemptionCodeCreationCount = User.redemptionStatistics.myTotalRedemptionCodeCreationCount + 1;
    User.redemptionStatistics.createCodeFdxSpent = User.redemptionStatistics.createCodeFdxSpent + amount;
    await User.save();
    //   Generate unique code
    req.body.code = shortlink.generate(10);
    // convert into integer
    // req.body.amount = amount;
    const redeem = await new Redeem({ ...req.body });
    const savedRedeem = await redeem.save();
    if (!savedRedeem) throw new Error("Redeem Not Created Successfully!");
    res.status(201).json({ data: savedRedeem });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while create Redeem: ${error.message}`,
    });
  }
};

const transfer = async (req, res) => {
  try {
    const { uuid, code } = req.body;
    // check receiver account exist
    const User = await UserModel.findOne({ uuid });
    if (!User) throw new Error("No such User!");

    //   Fetch the redeem data
    const getRedeem = await Redeem.findOne({ code }).populate("owner", "uuid");
    if (!getRedeem) throw new Error("Code is invalid!");

    // Check Already redeemed
    if (getRedeem.status === "redeemed") throw new Error("Already Redeemed!");

    //   check the owner
    // if (getRedeem.owner.uuid === uuid)
    //   throw new Error("You're already the owner of this redemption");

    // Create Ledger
    // sender
    await createLedger({
      uuid: getRedeem.owner.uuid,
      txUserAction: "redemptionTransferred",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: getRedeem.owner.uuid,
      txTo: req.body.uuid,
      txAmount: getRedeem.amount,
      // txDescription : "User update redemption code"
      type: "redemption",
    });
    // const senderSpent = await UserModel.findOne({uuid: getRedeem.owner.uuid});
    // senderSpent.fdxSpent = senderSpent.fdxSpent + getRedeem.amount;
    // await senderSpent.save();
    // Create Ledger
    // receiver
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "redemptionReceived",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: getRedeem.owner.uuid,
      txTo: req.body.uuid,
      txAmount: getRedeem.amount,
      // txDescription : "User update redemption code"
      type: "redemption",
    });
    // Increment the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: getRedeem.amount,
      inc: true,
    });
    const receiverEarned = await UserModel.findOne({uuid: req.body.uuid});
    receiverEarned.fdxEarned = receiverEarned.fdxEarned + getRedeem.amount;
    receiverEarned.redemptionStatistics.codeRedeemedFdxEarned = receiverEarned.redemptionStatistics.codeRedeemedFdxEarned + getRedeem.amount;
    await receiverEarned.save();
    // Update the Redeem
    // getRedeem.code = shortlink.generate(10),
    getRedeem.owner = User._id;
    getRedeem.status = "redeemed";
    const updatedRedeem = await getRedeem.save();
    if (!updatedRedeem) throw new Error("Redeem Not updated Successfully!");
    res.status(201).json({ data: updatedRedeem });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while transfer Redeem: ${error.message}`,
    });
  }
};

const deleteRedeem = async (req, res) => {
  try {
    const { uuid, code } = req.body;
    // check receiver account exist
    const User = await UserModel.findOne({ uuid });
    if (!User) throw new Error("No such User!");

    //   Fetch the redeem data
    const deletedRedeem = await Redeem.findOneAndDelete({ code }).populate(
      "owner",
      "uuid"
    );
    // if (!deletedRedeem) throw new Error("Code is invalid!");

    // Create ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "redemptionDeleted",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: deletedRedeem.owner.uuid,
      txTo: req.body.uuid,
      txAmount: deletedRedeem.amount,
      // txDescription : "User update redemption code"
      type: "redemption",
    });

    res.status(200).json({ data: "", msg: "Successfully deleted!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while delete Redeem: ${error.message}`,
    });
  }
};

const balance = async (req, res) => {
  try {
    const { uuid, code } = req.body;
    // check receiver balance exist
    const User = await UserModel.findOne({ uuid });
    if (!User) throw new Error("No such User!");

    //   Fetch the redeem data
    const getRedeem = await Redeem.findOne({ code }).populate("owner", "uuid");
    if (!getRedeem) throw new Error("Code is invalid!");

    //   check the owner
    if (getRedeem.owner.uuid !== uuid) throw new Error("You cannot redeem!");

    // Create Ledger
    // receiver
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "balanceRedeem",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: getRedeem.owner.uuid,
      txTo: req.body.uuid,
      txAmount: getRedeem.amount,
      // txDescription : "User update redemption code"
      type: "redemption",
    });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: getRedeem.amount,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + getRedeem.amount;
    await User.save();

    // Delete the Redeem
    const deletedRedeem = await getRedeem.deleteOne();
    // if (!deletedRedeem) throw new Error("Redeem Not deleted Successfully!");
    res.status(201).json({ data: deletedRedeem });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while create Redeem: ${error.message}`,
    });
  }
};

const getUnredeemedById = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const _id = req.params.id;
    const uuid = req.params.uuid;

    const redeem = await Redeem.find({ owner: _id, status: "unredeemed" }).sort(
      { _id: -1 }
    );

    res.status(200).json({
      data: redeem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getUnredeemedById Redeem: ${error.message}`,
    });
  }
};

const getRedeemHistoryById = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const _id = req.params.id;
    const uuid = req.params.uuid;

    const redeem = await Redeem.find({ owner: _id, status: "redeemed" });

    res.status(200).json({
      data: redeem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getRedeemHistoryById Redeem: ${error.message}`,
    });
  }
};

// const getById = async (req, res) => {
//   try {
//     const { page, limit } = req.query;
//     const uuid = req.cookies.uuid;
//     const skip = (page - 1) * limit;

//     const redeem = await Redeem.find({ uuid })
//       // .sort({ _id: 1 }) // Adjust the sorting based on your needs
//       .sort(req.query.sort === "newest" ? { _id: -1 } : { _id: 1 }) // Adjust the sorting based on your needs
//       .skip(skip)
//       .limit(parseInt(limit));

//     const totalCount = await Redeem.countDocuments({ uuid });
//     const pageCount = Math.ceil(totalCount / limit);

//     res.status(200).json({
//       data: redeem,
//       pageCount,
//       totalCount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: `An error occurred while getById Redeem: ${error.message}`,
//     });
//   }
// };

const getAll = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const redeem = await Redeem.find({})
      .sort(req.query.sort === "newest" ? { _id: 1 } : { _id: -1 }) // Adjust the sorting based on your needs
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Redeem.countDocuments();
    const pageCount = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: redeem,
      pageCount,
      totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while getAll Redeem: ${error.message}`,
    });
  }
};

// const search = async (req, res) => {
//   try {
//     const { page, limit, sort, term } = req.body.params;
//     const skip = (page - 1) * limit;
//     const searchTerm = term || "";

//     const redeem = await Redeem.find({
//       $or: [
//         { txUserAction: { $regex: searchTerm, $options: "i" } },
//         { txID: { $regex: searchTerm, $options: "i" } },
//         { txData: { $regex: searchTerm, $options: "i" } },
//       ],
//     })
//       .sort(sort === "newest" ? { _id: 1 } : { _id: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const totalCount = await Redeem.countDocuments({
//       $or: [
//         { txUserAction: { $regex: searchTerm, $options: "i" } },
//         { txID: { $regex: searchTerm, $options: "i" } },
//         { txData: { $regex: searchTerm, $options: "i" } },
//       ],
//     });
//     const pageCount = Math.ceil(totalCount / limit);
//     //console.log(pageCount);
//     //console.log(totalCount);

//     res.status(200).json({
//       data: redeem,
//       pageCount,
//       totalCount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: ` An error occurred while search Redeem: ${error.message}`,
//     });
//   }
// };

// const remove = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const redeem = Redeem.findByIdAndDelete(id);
//     res.status(200).json({ data: redeem });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: `An error occurred while remove Redeem: ${error.message}`,
//     });
//   }
// };

module.exports = {
  create,
  transfer,
  deleteRedeem,
  balance,
  getUnredeemedById,
  getRedeemHistoryById,
};
