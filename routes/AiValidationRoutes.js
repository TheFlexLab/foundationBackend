const express = require("express");
const router = express.Router();
// controller
const AiValidationController = require("../controller/AiValidationController");
// middleware
const protect = require("../middleware/protect");
const cache = require("../middleware/cache");
const aiValidationModerator = require("../middleware/aiValidationModerator");

/**
 * @swagger
 * tags:
 *   name: AI Validation
 *   description: Endpoints for AI validation
 */

router.get(
  "/ai-validation/:callType",
  // cache,
  /**
   * @swagger
   * /ai-validation/{callType}:
   *   get:
   *     tags:
   *       - AI Validation
   *     summary: Get AI validation
   *     description: Get AI validation based on call type
   *     parameters:
   *       - in: path
   *         name: callType
   *         schema:
   *           type: string
   *         required: true
   *         description: Type of the call
   *     responses:
   *       '200':
   *         description: Successful response
   *       '500':
   *         description: Internal server error
   */
  // aiValidationModerator,
  AiValidationController.validation
);

router.post(
  "/ai-validation/moderator",
  /**
   * @swagger
   * /ai-validation/moderator:
   *   post:
   *     tags:
   *       - AI Validation
   *     summary: Send AI validation to moderator
   *     description: Send AI validation result to moderator for review
   *     responses:
   *       '200':
   *         description: Successful response
   *       '500':
   *         description: Internal server error
   */
  // aiValidationModerator,
  AiValidationController.moderator
);

module.exports = router;
