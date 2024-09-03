const { MAINTENANCE, FRONTEND_URL } = require("../config/env");

module.exports = function (req, res, next) {
  if (MAINTENANCE) {
    res.status(503).json({ message: "Service Unavailable" }); // Service Unavailable
  } else {
    next();
  }
};
