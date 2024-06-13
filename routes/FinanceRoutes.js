const express = require("express");
const router = express.Router();
// controller
const FinanceController = require("../controller/FinanceController");

/**
 * @swagger
 * tags:
 *   name: Finance
 *   description: Endpoints for managing finance
 */

// router.get("/checkConnectedAccounts/:userUuid",
//   /**
//    * @swagger
//    * /finance/connectStripe/{userUuid}:
//    *   get:
//    *     tags:
//    *       - Finance
//    *     summary: Get Finance
//    *     description: Endpoint for Stripe
//    *     parameters:
//    *       - in: path
//    *         name: userUuid
//    *         required: true
//    *         schema:
//    *           type: string
//    *         description: UUID of the user
//    *     responses:
//    *       '200':
//    *         description: Stripe Connected Successfully
//    *       '500':
//    *         description: Internal server error
//    */
//   FinanceController.checkConnectedAccounts
// );

// router.post("/connect",
//   /**
//    * @swagger
//    * /finance/connect:
//    *   post:
//    *     tags:
//    *       - Finance
//    *     summary: Connect to Stripe
//    *     description: Endpoint for Stripe connection
//    *     requestBody:
//    *       required: true
//    *       content:
//    *         application/json:
//    *           schema:
//    *             type: object
//    *             properties:
//    *               userUuid:
//    *                 type: string
//    *                 description: UUID of the user
//    *     responses:
//    *       '200':
//    *         description: Stripe Connected Successfully
//    *       '500':
//    *         description: Internal server error
//    */
//   FinanceController.connect
// );

router.post("/spay",
  /**
   * @swagger
   * /finance/spay:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to Stripe
   *     description: Endpoint for Stripe Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: Stripe Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.spay
);

router.post("/getStripePaymentIntent",
  /**
   * @swagger
   * /finance/getStripePaymentIntent:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to Stripe
   *     description: Endpoint for Stripe Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: Stripe Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.getStripePaymentIntent
);

router.post("/ppayToken",
  /**
   * @swagger
   * /finance/ppayToken:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to PPay
   *     description: Endpoint for PPay Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: PPay Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.ppayToken
);

router.post("/order",
  /**
   * @swagger
   * /finance/order:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to PPay
   *     description: Endpoint for PPay Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: PPay Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.order
);

router.post("/:orderID/captureOrderCall",
  /**
   * @swagger
   * /finance/:orderID/captureOrderCall:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to PPay
   *     description: Endpoint for PPay Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: PPay Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.captureOrderCall
);

router.post("/ppay",
  /**
   * @swagger
   * /finance/ppay:
   *   post:
   *     tags:
   *       - Finance
   *     summary: Pay to Stripe
   *     description: Endpoint for Stripe Payment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: Stripe Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.ppay
);

router.get("/purchasedFdxHistory/:userUuid",
  /**
   * @swagger
   * /finance/purchasedFdxHistory/{userUuid}:
   *   get:
   *     tags:
   *       - Finance
   *     summary: Get Finance
   *     description: Endpoint for getting User's Purchased FDX History.
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         schema:
   *           type: string
   *         description: UUID of the user
   *     responses:
   *       '200':
   *         description: Stripe Connected Successfully
   *       '500':
   *         description: Internal server error
   */
  FinanceController.purchasedFdxHistory
);

// router.patch("/update",
//   /**
//    * @swagger
//    * /treasury/update:
//    *   patch:
//    *     tags:
//    *       - Treasury
//    *     summary: Update treasury
//    *     description: Endpoint to update an existing treasury
//    *     requestBody:
//    *       required: true
//    *       content:
//    *         application/json:
//    *           schema:
//    *             $ref: '#/components/schemas/TreasuryUpdateRequest'
//    *     responses:
//    *       '200':
//    *         description: Treasury updated successfully
//    *       '500':
//    *         description: Internal server error
//    */
//   TreasuryController.update
// );

// router.get("/get",
//   /**
//    * @swagger
//    * /treasury/get:
//    *   get:
//    *     tags:
//    *       - Treasury
//    *     summary: Get treasury
//    *     description: Endpoint to get treasury information
//    *     responses:
//    *       '200':
//    *         description: Successfully retrieved treasury information
//    *       '500':
//    *         description: Internal server error
//    */
//   TreasuryController.get
// );

module.exports = router;
