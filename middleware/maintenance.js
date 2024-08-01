const { MAINTENANCE, FRONTEND_URL } = require("../config/env");

module.exports = function (req, res, next) {
  if (false) {
    res.status(503).json({ message: "Service Unavailable" }); // Service Unavailable
  } else {
    next();
  }
};
