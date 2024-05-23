const express = require("express");
const router = express.Router();
// controller
// const DevScriptController = require("../controller/DevScriptController");

/**
 * @swagger
 * tags:
 *   name: DevScriptRoutes
 *   description: Endpoints for user DevScriptRoutes
 */

// router.patch(
//   "/excep",
//   /**
//   * @swagger
//   * /devscript/excep:
//   *   patch:
//   *     tags:
//   *       - DevScriptRoutes
//   *     summary: Set badge data for all users
//   *     description: Endpoint to set badge data for all users in the database
//   *     responses:
//   *       '200':
//   *         description: Badge data encrypted successfully for all users
//   *       '500':
//   *         description: Internal server error
//   */
//   DevScriptController.excep
// )

// router.patch(
//   "/encryptBadgeData",
//   /**
//   * @swagger
//   * /devscript/encryptBadgeData:
//   *   patch:
//   *     tags:
//   *       - DevScriptRoutes
//   *     summary: Encrypt badge data for all users
//   *     description: Endpoint to encrypt badge data for all users in the database
//   *     responses:
//   *       '200':
//   *         description: Badge data encrypted successfully for all users
//   *       '500':
//   *         description: Internal server error
//   */
//   DevScriptController.encryptBadgeData
// )

// router.get(
//   "/createUserListForAllUsers",
//   /**
//    * @swagger
//    * /devscript/createUserListForAllUsers:
//    *   get:
//    *     tags:
//    *       - DevScriptRoutes
//    *     summary: Get user's list information
//    *     description: Endpoint to get information of a user
//    *     responses:
//    *       '200':
//    *         description: User information retrieved successfully
//    *       '500':
//    *         description: Internal server error
//    */
//   DevScriptController.createUserListForAllUsers
// );

module.exports = router;