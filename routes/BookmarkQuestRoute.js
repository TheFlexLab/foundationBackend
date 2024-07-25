const express = require("express");
const router = express.Router();
// controller
const BookmarkQuestController = require("../controller/BookmarkQuestController");
// middleware
const protect = require("../middleware/protect");
const cache = require("../middleware/cache");
const isUrlSharedPostValidToInteract = require("../middleware/isUrlSharedPostValidToInteract");
const isGuest = require("../middleware/isGuest");

/**
 * @swagger
 * tags:
 *   name: Bookmark Quest
 *   description: Endpoints for bookmarking quests and questions
 */

router.post(
  "/createBookmarkQuest",
  isUrlSharedPostValidToInteract,
  isGuest,
  /**
   * @swagger
   * /bookmarkQuest/createBookmarkQuest:
   *   post:
   *     tags:
   *       - Bookmark Quest
   *     summary: Create a bookmark for a quest
   *     description: Endpoint to create a bookmark for a quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BookmarkQuestInput'
   *     responses:
   *       '200':
   *         description: Bookmark created successfully
   *       '500':
   *         description: Internal server error
   */
  BookmarkQuestController.createBookmarkQuest
);

router.post("/deleteBookmarkQuest",
  /**
   * @swagger
   * /bookmarkQuest/deleteBookmarkQuest:
   *   post:
   *     tags:
   *       - Bookmark Quest
   *     summary: Delete a bookmark for a quest
   *     description: Endpoint to delete a bookmark for a quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BookmarkQuestInput'
   *     responses:
   *       '200':
   *         description: Bookmark deleted successfully
   *       '500':
   *         description: Internal server error
   */
  BookmarkQuestController.deleteBookmarkQuest
);

// Not being use at FE, Send `req.body.uuid` in body 1st
router.post("/getAllBookmarkQuests",
  /**
   * @swagger
   * /bookmarkQuest/getAllBookmarkQuests:
   *   post:
   *     tags:
   *       - Bookmark Quest
   *     summary: Get all bookmarked quests
   *     description: Endpoint to get all bookmarked quests
   *     responses:
   *       '200':
   *         description: Successfully retrieved all bookmarked quests
   *       '500':
   *         description: Internal server error
   */
  BookmarkQuestController.getAllBookmarkQuests
);

// Not being use at FE, Send `req.body.uuid` in body 1st
router.post("/getAllBookmarkQuestions",
  /**
   * @swagger
   * /bookmarkQuest/getAllBookmarkQuestions:
   *   post:
   *     tags:
   *       - Bookmark Quest
   *     summary: Get all bookmarked questions
   *     description: Endpoint to get all bookmarked questions
   *     responses:
   *       '200':
   *         description: Successfully retrieved all bookmarked questions
   *       '500':
   *         description: Internal server error
   */
  BookmarkQuestController.getAllBookmarkQuestions
);



module.exports = router;
