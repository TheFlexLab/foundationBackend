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
  "/userList/:userUuid/:categoryName?",
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
   *       - in: query
   *         name: categoryName
   *         required: false
   *         description: The categoryName of the user's List
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

router.get(
  "/userList/findCategoryByName/:userUuid/:categoryName",
  /**
   * @swagger
   * /userlists/userList/findCategoryByName/{userUuid}/{categoryName}:
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
   *         name: categoryName
   *         required: true
   *         description: The categoryName of the user's List
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.findCategoryByName
);

router.patch(
  "/userList/updateCategoryInUserList/:userUuid/:categoryId/:postId?",
  /**
   * @swagger
   * /userlists/userList/updateCategoryInUserList/{userUuid}/{categoryId}:
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
   *       - in: query
   *         name: postId
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

// Generate Link or Customized Link for List.
router.get(
  "/userList/generateCategoryShareLink/:userUuid/:categoryId/:customizedLink?",
  /**
   * @swagger
   * /userlists/userList/generateCategoryShareLink/{userUuid}/{categoryId}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list shared link
   *     description: Endpoint to get shared link of a user
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         description: The userUuid of the user
   *         schema:
   *           type: string
   *       - in: path
   *         name: categoryId
   *         required: true
   *         description: The categoryId of the user
   *         schema:
   *           type: string
   *       - in: query
   *         name: customizedLink
   *         required: false
   *         description: A String to customized List Sharing link
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User shared link retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.generateCategoryShareLink
);

router.get(
  "/userList/findCategoryByLink/:categoryLink",
  /**
   * @swagger
   * /userlists/userList/findCategoryByLink/{categoryLink}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get list of a user by link
   *     parameters:
   *       - in: path
   *         name: categoryLink
   *         required: true
   *         description: The categoryLink of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.findCategoryByLink
);

router.get(
  "/userList/categoryViewCount/:categoryLink",
  /**
   * @swagger
   * /userlists/userList/findCategoryByLink/{categoryLink}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get list of a user by link
   *     parameters:
   *       - in: path
   *         name: categoryLink
   *         required: true
   *         description: The categoryLink of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.categoryViewCount
);

router.get(
  "/userList/categoryParticipentsCount/:categoryLink",
  /**
   * @swagger
   * /userlists/userList/findCategoryByLink/{categoryLink}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get list of a user by link
   *     parameters:
   *       - in: path
   *         name: categoryLink
   *         required: true
   *         description: The categoryLink of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.categoryParticipentsCount
);

router.get(
  "/userList/categoryStatistics/:categoryId",
  /**
   * @swagger
   * /userlists/userList/findCategoryByLink/{categoryId}:
   *   get:
   *     tags:
   *       - UserSurveyList
   *     summary: Get user's list information
   *     description: Endpoint to get list of a user by link
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         description: The categoryId of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  UserSurveyListController.categoryStatistics
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
