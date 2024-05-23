const express = require("express");
const router = express.Router();
// controller
const UserSurveyListController = require("../controller/UserSurveyListController");

/**
 * @swagger
 * tags:
 *   name: UserSurveyList
 *   description: Endpoints for user UserSurveyList
 */

// User's List APIs

router.get(
  "/userList/:userUuid",
  /**
   * @swagger
   * /userlists/userList/{userUuid}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get information of a user
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         description: The userUuid of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.userList
);

router.post(
  "/userList/addCategoryInUserList",
  /**
   * @swagger
   * /userlists/userList/addCategoryInUserList:
   *   post:
   *     tags:
   *       - UserSurveyList
   *     summary: Set bookmark states
   *     description: Endpoint to set bookmark states for a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: 
   *             $ref: '#/components/schemas/BookmarkStatesSetRequest'
   *     responses:
   *       '200':
   *         description: Bookmark states set successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.addCategoryInUserList
);

router.get(
  "/userList/findCategoryById/:userUuid/:categoryId",
  /**
   * @swagger
   * /userlists/userList/findCategoryById/{userUuid}/{categoryId}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get information of a user
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         description: The userUuid of the user
   *       - in: path
   *         name: categoryId
   *         required: true
   *         description: The categoryId of the user's List
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.findCategoryById
);

router.patch(
  "/userList/updateCategoryInUserList/:userUuid/:categoryId/:postId?",
  /**
   * @swagger
   * /userlists/userList/updateCategoryInUserList/{userUuid}/{categoryId}/{postId}:
   *   patch:
   *     tags:
   *       - UserSurveyList
   *     summary: Update bookmark states
   *     description: Endpoint to update bookmark states for a user
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         description: The userUuid of the user
   *       - in: path
   *         name: categoryId
   *         required: true
   *         description: The categoryId of the user's List
   *       - name: postId
   *         in: query
   *         required: false
   *         schema:
   *           type: string
   *         description: ID of the post (optional)
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BookmarkStatesSetRequest'
   *     responses:
   *       '200':
   *         description: Bookmark states updated successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.updateCategoryInUserList
);

router.delete(
  "/userList/deleteCategoryFromList/:userUuid/:categoryId",
  /**
   * @swagger
   * /userlists/userList/deleteCategoryFromList/{userUuid}/{categoryId}:
   *   delete:
   *     tags:
   *       - UserSurveyList
   *     summary: Delete a post from a user's category
   *     description: Endpoint to delete a specific post from a user's category list
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         schema:
   *           type: string
   *         required: true
   *         description: UUID of the user
   *       - in: path
   *         name: categoryId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the category
   *     responses:
   *       '200':
   *         description: Post deleted successfully
   *       '404':
   *         description: User, category, or post not found
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.deleteCategoryFromList
);

router.post(
  "/userList/addPostInCategoryInUserList",
  /**
   * @swagger
   * /userlists/userList/addPostInCategoryInUserList:
   *   post:
   *     tags:
   *       - UserSurveyList
   *     summary: Set bookmark states
   *     description: Endpoint to set bookmark states for a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: 
   *             $ref: '#/components/schemas/BookmarkStatesSetRequest'
   *     responses:
   *       '200':
   *         description: Bookmark states set successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.addPostInCategoryInUserList
);

module.exports = router;
