const express = require("express");
const router = express.Router();
// controller
const OtpController = require("../controller/OtpController");
// middleware
const protect = require("../middleware/protect");

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: Endpoints for OTP management
 */

router.post("/sendOtp",
  /**
   * @swagger
   * /sendOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Send OTP
   *     description: Endpoint to send OTP to the user's phone number or email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpRequest'
   *     responses:
   *       '200':
   *         description: OTP sent successfully
   *       '500':
   *         description: Internal server error
   */
  OtpController.sendOtp
);

router.post("/verifyOtp",
  /**
   * @swagger
   * /verifyOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Verify OTP
   *     description: Endpoint to verify OTP entered by the user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpVerification'
   *     responses:
   *       '200':
   *         description: OTP verified successfully
   *       '400':
   *         description: Invalid OTP
   *       '500':
   *         description: Internal server error
   */
  OtpController.verifyOtp
);

router.post("/resendOtp",
  /**
   * @swagger
   * /resendOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Resend OTP
   *     description: Endpoint to resend OTP to the user's phone number or email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpRequest'
   *     responses:
   *       '200':
   *         description: OTP resent successfully
   *       '500':
   *         description: Internal server error
   */
  OtpController.resendOtp
);

router.post("/sendEmailOtp",
  /**
   * @swagger
   * /sendEmailOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Send OTP
   *     description: Endpoint to send OTP to the user's phone number or email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpRequest'
   *     responses:
   *       '200':
   *         description: OTP sent successfully
   *       '500':
   *         description: Internal server error
   */
  OtpController.sendEmailOtp
);

router.post("/verifyEmailOtp",
  /**
   * @swagger
   * /verifyEmailOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Verify OTP
   *     description: Endpoint to verify OTP entered by the user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpVerification'
   *     responses:
   *       '200':
   *         description: OTP verified successfully
   *       '400':
   *         description: Invalid OTP
   *       '500':
   *         description: Internal server error
   */
  OtpController.verifyEmailOtp
);

router.post("/resendEmailOtp",
  /**
   * @swagger
   * /resendEmailOtp:
   *   post:
   *     tags:
   *       - OTP
   *     summary: Resend OTP
   *     description: Endpoint to resend OTP to the user's phone number or email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OtpRequest'
   *     responses:
   *       '200':
   *         description: OTP resent successfully
   *       '500':
   *         description: Internal server error
   */
  OtpController.resendEmailOtp
);

module.exports = router;
