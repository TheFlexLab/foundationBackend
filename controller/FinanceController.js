const Treasury = require("../models/Treasury");

const create = async (req, res) => {
  try {
    const { amount } = req.query;
    const treasuryEntry = new Treasury({ amount });
    const savedTreasury = await treasuryEntry.save();
    if (!savedTreasury) throw new Error("Treasury Not Created Successfully!");
    res.status(201).json({ data: savedTreasury });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: `An error occurred while create Treasury: ${error.message}`,
      });
  }
};

const update = async (req, res) => {
  try {
    const { amount } = req.query;
    const treasury = await Treasury.updateOne({ $set: { amount } });
    if (!treasury) throw new Error("No such Treasury!");
    res.status(200).json({ data: treasury.modifiedCount });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: `An error occurred while update Ledger: ${error.message}`,
      });
  }
};

const get = async (req, res) => {
  try {
    const getTreasury = await Treasury.findOne();
    res.status(200).json({
      data: getTreasury?.amount?.toString(),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: ` An error occurred while get Treasury: ${error.message}`,
      });
  }
};

module.exports = {
  create,
  update,
  get,
};
