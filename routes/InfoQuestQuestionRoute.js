const express = require("express");
const router = express.Router();
// controller
const InfoQuestQuestionController = require("../controller/InfoQuestQuestionController");
// middleware
const protect = require("../middleware/protect");
const isUrlSharedPostValidToInteract = require("../middleware/isUrlSharedPostValidToInteract");

/**
 * @swagger
 * tags:
 *   name: Info Quest Question
 *   description: Endpoints for managing info quest questions
 */

router.post(
  "/createInfoQuestQuest",
  /**
   * @swagger
   * /infoquestions/createInfoQuestQuest:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Create info quest question
   *     description: Endpoint to create a new info quest question
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InfoQuestQuestionCreationRequest'
   *     responses:
   *       '200':
   *         description: Info quest question created successfully
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.createInfoQuestQuest
);

router.delete(
  "/deleteInfoQuest/:questId/:userUuid",
  /**
   * @swagger
   * /infoquestions/deleteInfoQuest/{questId}/{userUuid}:
   *   delete:
   *     tags:
   *       - Info Quest Question
   *     summary: Delete info quest question
   *     description: Endpoint to delete a new info quest question
   *     parameters:
   *       - in: path
   *         name: questId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the info quest question to delete
   *       - in: path
   *         name: userUuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user associated with the info quest question
   *     responses:
   *       '200':
   *         description: Info quest question deleted successfully
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.deleteInfoQuestQuest
);

router.post(
  "/supressPost/:id",
  /**
   * @swagger
   * /infoquestions/supressPost/{id}:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Create info quest question
   *     description: Endpoint to create a new info quest question
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InfoQuestQuestionCreationRequest'
   *     responses:
   *       '200':
   *         description: Info quest question created successfully
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.suppressPost
);

router.get(
  "/constraintForUniqueQuestion",
  /**
   * @swagger
   * /infoquestions/constraintForUniqueQuestion:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Check constraint for unique question
   *     description: Endpoint to check constraint for unique question
   *     responses:
   *       '200':
   *         description: Constraint check successful
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.constraintForUniqueQuestion
);

router.post(
  "/getAllQuests",
  /**
   * @swagger
   * /infoquestions/getAllQuests:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests
   *     description: Endpoint to retrieve all info quest questions
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuests
);

router.post(
  "/getAllQuestsWithOpenInfoQuestStatus",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithOpenInfoQuestStatus:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with open info quest status
   *     description: Endpoint to retrieve all info quest questions with open status
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with open status
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithOpenInfoQuestStatus
);

router.post(
  "/getAllQuestsWithAnsweredStatus",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithAnsweredStatus:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with answered status
   *     description: Endpoint to retrieve all info quest questions with answered status
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with answered status
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithAnsweredStatus
);

router.post(
  "/getAllQuestsWithDefaultStatus",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithDefaultStatus:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with default status
   *     description: Endpoint to retrieve all info quest questions with default status
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with default status
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithDefaultStatus
);

router.post(
  "/getAllQuestsWithResult",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithResult:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with result
   *     description: Endpoint to retrieve all info quest questions with result
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with result
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithResult
);

router.get(
  "/getQuest/:uuid/:id/:page?/:postLink?",
  /**
   * @swagger
   * /infoquestions/getQuest/{uuid}/{id}/{page}/{postLink}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get quest by ID
   *     description: Endpoint to retrieve a specific info quest question by its ID
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the quest
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the quest
   *       - in: path
   *         name: page
   *         required: false
   *         schema:
   *           type: number
   *         description: The page number (optional)
   *       - in: path
   *         name: postLink
   *         required: false
   *         schema:
   *           type: string
   *         description: The post link (optional)
   *     responses:
   *       '200':
   *         description: Successfully retrieved the info quest question
   *       '404':
   *         description: Info quest question not found
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getQuestById
);

router.get(
  "/getQuest/:uniqueShareLink/:uuid?",
  /**
   * @swagger
   * /infoquestions/getQuest/{uniqueShareLink}/{uuid}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get quest by unique share link
   *     description: Endpoint to retrieve a specific info quest question by its unique share link
   *     parameters:
   *       - in: path
   *         name: uniqueShareLink
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique share link of the quest
   *     responses:
   *       '200':
   *         description: Successfully retrieved the info quest question
   *       '404':
   *         description: Info quest question not found
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getQuestByUniqueShareLink
);

router.get(
  "/getQuestByUniqueId/:postId/:uuid",
  /**
   * @swagger
   * /infoquestions/getQuestByUniqueId/{postId}/{uuid}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get quest by unique share link
   *     description: Endpoint to retrieve a specific info quest question by its unique share link
   *     parameters:
   *       - in: path
   *         name: postId
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique share link of the quest
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique share link of the quest
   *     responses:
   *       '200':
   *         description: Successfully retrieved the info quest question
   *       '404':
   *         description: Info quest question not found
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getQuestByUniqueId
);

router.get(
  "/getEmbededPostByUniqueId/:id",
  /**
   * @swagger
   * /infoquestions/getQuestByUniqueId/{postId}/{uuid}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get quest by unique share link
   *     description: Endpoint to retrieve a specific info quest question by its unique share link
   *     parameters:
   *       - in: path
   *         name: postId
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique share link of the quest
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique share link of the quest
   *     responses:
   *       '200':
   *         description: Successfully retrieved the info quest question
   *       '404':
   *         description: Info quest question not found
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getEmbededPostByUniqueId
);
router.post(
  "/getAllQuestsWithCompletedStatus",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithCompletedStatus:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with completed status
   *     description: Endpoint to retrieve all info quest questions with completed status
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with completed status
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithCompletedStatus
);

router.post(
  "/getAllQuestsWithChangeAnsStatus",
  /**
   * @swagger
   * /infoquestions/getAllQuestsWithChangeAnsStatus:
   *   post:
   *     tags:
   *       - Info Quest Question
   *     summary: Get all quests with change answer status
   *     description: Endpoint to retrieve all info quest questions with change answer status
   *     responses:
   *       '200':
   *         description: Successfully retrieved all info quest questions with change answer status
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getAllQuestsWithChangeAnsStatus
);
router.get(
  "/checkMediaDuplicateUrl/:id",
  /**
   * @swagger
   * /infoquestions/checkMediaDuplicateUrl/{id}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Check media duplicate URL
   *     description: Endpoint to check if the media URL is duplicate
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the media
   *     responses:
   *       '200':
   *         description: Media URL is not duplicate
   *       '409':
   *         description: Media URL is duplicate
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.checkMediaDuplicateUrl
);

router.get(
  "/checkGifDuplicateUrl/:url",
  /**
   * @swagger
   * /infoquestions/checkMediaDuplicateUrl/{id}:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Check media duplicate URL
   *     description: Endpoint to check if the media URL is duplicate
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the media
   *     responses:
   *       '200':
   *         description: Media URL is not duplicate
   *       '409':
   *         description: Media URL is duplicate
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.checkGifDuplicateUrl
);
router.get(
  "/getFullSoundcloudUrlFromShortUrl",
  /**
   * @swagger
   * /infoquestions/getFullSoundcloudUrlFromShortUrl:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get full Soundcloud URL from short URL
   *     description: Endpoint to retrieve full Soundcloud URL from short URL
   *     responses:
   *       '200':
   *         description: Full Soundcloud URL retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getFullSoundcloudUrlFromShortUrl
);

router.get(
  "/getFlickerUrl",
  /**
   * @swagger
   * /infoquestions/getFlickerUrl:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get Flicker URL
   *     description: Endpoint to retrieve Flicker URL
   *     responses:
   *       '200':
   *         description: Flicker URL retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  InfoQuestQuestionController.getFlickerUrl
);

router.get(
  "/getQuestsAll",
  // isUrlSharedPostValidToInteract,
  /**
   * @swagger
   * /infoquestions/getQuestsAll:
   *   get:
   *     tags:
   *       - Info Quest Question
   *     summary: Get All Quests
   *     description: Retrieve all quests with optional filtering and pagination.
   *     parameters:
   *       - in: query
   *         name: uuid
   *         schema:
   *           type: string
   *         description: UUID of the user.
   *       - in: query
   *         name: _page
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Page number for pagination.
   *       - in: query
   *         name: _limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Maximum number of quests per page.
   *       - in: query
   *         name: filter
   *         schema:
   *           type: boolean
   *         description: Filter criteria for quests.
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [Oldest First, Newest First, Last Updated, Most Popular]
   *         description: Sort criteria for quests.
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Type of quests.
   *       - in: query
   *         name: Page
   *         schema:
   *           type: string
   *           enum: [Bookmark, Hidden, SharedLink,Feedback]
   *         description: Page criteria for quests.
   *       - in: query
   *         name: terms
   *         schema:
   *           type: string
   *         description: Terms for quests.
   *       - in: query
   *         name: blockedTerms
   *         schema:
   *           type: string
   *         description: Blocked terms for quests.
   *       - in: query
   *         name: moderationRatingInitial
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 1000
   *         description: Initial moderation rating for quests.
   *       - in: query
   *         name: moderationRatingFinal
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 1000
   *         description: Final moderation rating for quests.
   *       - in: query
   *         name: participated
   *         schema:
   *           type: string
   *           enum: [Yes, No, All]
   *         description: Whether user has participated in quests. Accepted values are "Yes", "No", or "All".
   *       - in: query
   *         name: start
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 5
   *         description: Start date for quests.
   *       - in: query
   *         name: end
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 5
   *         description: End date for quests.
   *       - in: query
   *         name: media
   *         schema:
   *           type: string
   *           enum: [All, Video, Music, Image]
   *         description: Media type for quests.
   *     responses:
   *       '200':
   *         description: A list of quests.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Quest'
   *       '400':
   *         description: Bad request. Invalid parameters provided.
   *       '500':
   *         description: Internal server error. Failed to retrieve quests.
   */
  InfoQuestQuestionController.getQuestsAll
);

module.exports = router;
