const express = require("express");
const router = express.Router();
// controller
const DevScriptController = require("../controller/DevScriptController");

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

router.get(
  "/createUserListForAllUsers",
  /**
   * @swagger
   * /devscript/createUserListForAllUsers:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Get user's list information
   *     description: Endpoint to get information of a user
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.createUserListForAllUsers
);

router.post(
  "/dbReset",
  /**
   * @swagger
   * /devscript/dbReset:
   *   post:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Reset the database
   *     description: Endpoint to reset the database
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               db:
   *                 type: string
   *                 enum: [main, stag, dev]
   *                 example: main
   *                 description: The database to reset
   *     responses:
   *       '200':
   *         description: Database reset successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.dbReset
);

router.get(
  "/userListSeoSetting",
  /**
   * @swagger
   * /devscript/userListSeoSetting:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users list seo
   *     description: To Set users list seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.userListSeoSetting
);

router.get(
  "/userPostSeoSetting",
  /**
   * @swagger
   * /devscript/userPostSeoSetting:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.userPostSeoSetting
);

module.exports = router;