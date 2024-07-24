const UserModel = require("../models/UserModel");

// This middleware function will be called for every incoming request
const isGuest = async (req, res, next) => {
  try {
    if (req.body.postLink) {
      next();
    } else if (!req.body.postLink) {
      let uuid;
      if (req.body.uuid) {
        uuid = req.body.uuid;
      } else {
        uuid = req.body.userUuid;
      }

      const isUserGuest = await UserModel.findOne({
        uuid: uuid,
        role: "guest",
      });

      if (isUserGuest) {
        return res.status(403).send({
          message: `Please Create an Account to unlock this feature`,
        });
      } else {
        next();
      }
    } else {
      throw new Error("Something went wrong!");
    }
  } catch (error) {
    // If an error occurs, pass it to the error handling middleware
    return error.message;
  }
};

module.exports = isGuest;
