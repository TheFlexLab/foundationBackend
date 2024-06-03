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

// router.post("/create",
//   /**
//    * @swagger
//    * /treasury/create:
//    *   post:
//    *     tags:
//    *       - Treasury
//    *     summary: Create treasury
//    *     description: Endpoint to create a new treasury
//    *     requestBody:
//    *       required: true
//    *       content:
//    *         application/json:
//    *           schema:
//    *             $ref: '#/components/schemas/TreasuryCreationRequest'
//    *     responses:
//    *       '200':
//    *         description: Treasury created successfully
//    *       '500':
//    *         description: Internal server error
//    */
//   TreasuryController.create
// );

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
