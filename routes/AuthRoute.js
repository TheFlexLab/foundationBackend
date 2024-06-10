const express = require("express");
const router = express.Router();
// controller
const AuthController = require("../controller/AuthController");
// middleware
const protect = require("../middleware/protect");
const cache = require("../middleware/cache");
const passport = require("passport");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints for user authentication
 */

router.put(
  "/changePassword",
  /**
   * @swagger
   * /user/changePassword:
   *   put:
   *     tags:
   *       - Authentication
   *     summary: Change password
   *     description: Endpoint to change user's password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangePasswordRequest'
   *     responses:
   *       '200':
   *         description: Password changed successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.changePassword
);

router.post(
  "/signUpUser",
  /**
   * @swagger
   * /user/signUpUser:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user
   *     description: Endpoint to sign up a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignUpUserRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpUser
);

router.post(
  "/signUpUser/social",
  /**
   * @swagger
   * /user/signUpUser/social:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user via social login
   *     description: Endpoint to sign up a new user using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignUpRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpUserBySocialLogin
);
router.post(
  "/signUpUser/socialBadges",
  /**
   * @swagger
   * /user/signUpUser/socialBadges:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user via social login
   *     description: Endpoint to sign up a new user using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignUpRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpUserBySocialBadges
);

router.post(
  "/signInUser/social",
  /**
   * @swagger
   * /user/signInUser/social:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign in user via social login
   *     description: Endpoint to sign in a user using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignInRequest'
   *     responses:
   *       '200':
   *         description: User signed in successfully via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signInUserBySocialLogin
);

router.post(
  "/signInUser/socialBadges",
  /**
   * @swagger
   * /user/signInUser/social:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign in user via social login
   *     description: Endpoint to sign in a user using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignInRequest'
   *     responses:
   *       '200':
   *         description: User signed in successfully via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signInUserBySocialBadges
);
router.post(
  "/signInUser",
  /**
   * @swagger
   * /user/signInUser:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign in user
   *     description: Endpoint to sign in a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignInUserRequest'
   *     responses:
   *       '200':
   *         description: User signed in successfully
   *       '400':
   *         description: Invalid request body
   *       '401':
   *         description: Unauthorized
   *       '500':
   *         description: Internal server error
   */
  AuthController.signInUser
);

router.post(
  "/send/email",
  /**
   * @swagger
   * /user/send/email:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Send email
   *     description: Endpoint to send an email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/EmailSendRequest'
   *     responses:
   *       '200':
   *         description: Email sent successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.sendEmail
);

router.post(
  "/create/guestMode",
  /**
   * @swagger
   * /user/create/guestMode:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Create guest mode
   *     description: Endpoint to create a guest mode
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GuestModeCreateRequest'
   *     responses:
   *       '200':
   *         description: Guest mode created successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.createGuestMode
);

router.post(
  "/signUp/guestMode",
  /**
   * @swagger
   * /user/signUp/guestMode:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user in guest mode
   *     description: Endpoint to sign up a new user in guest mode
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GuestModeSignUpRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully in guest mode
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpGuestMode
);

router.post(
  "/signUpSocial/guestMode",
  /**
   * @swagger
   * /user/signUpSocial/guestMode:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user in guest mode via social login
   *     description: Endpoint to sign up a new user in guest mode using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignUpGuestModeRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully in guest mode via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpSocialGuestMode
);
router.post(
  "/signUpGuest/SocialBadges",
  /**
   * @swagger
   * /user/signUpGuest/SocialBadges:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Sign up user in guest mode via social login
   *     description: Endpoint to sign up a new user in guest mode using social login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SocialSignUpGuestModeRequest'
   *     responses:
   *       '200':
   *         description: User signed up successfully in guest mode via social login
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signUpGuestBySocialBadges
);

router.post("/updateUserSettings", AuthController.updateUserSettings);

router.get(
  "/userInfo/:userUuid/:infoc?",
  /**
   * @swagger
   * /user/userInfo/{userUuid}:
   *   get:
   *     tags:
   *       - Authentication
   *     summary: Get user information
   *     description: Endpoint to get information of a user
   *     parameters:
   *       - in: path
   *         name: userUuid
   *         required: true
   *         description: The userUuid of the user
   *         schema:
   *           type: string
   *       - in: query
   *         name: infoc
   *         required: true
   *         description: The infoc of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  AuthController.userInfo
);

router.post(
  "/runtimeSignInPassword",
  /**
   * @swagger
   * /user/runtimeSignInPassword:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get user information by ID
   *     description: Endpoint to get information of a user by their ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserInfoByIdRequest'
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.runtimeSignInPassword
);

router.post(
  "/infoc",
  /**
   * @swagger
   * /user/infoc:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get user information by ID
   *     description: Endpoint to get information of a user by their ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserInfoByIdRequest'
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.infoc
);

router.post(
  "/userInfoById",
  /**
   * @swagger
   * /user/userInfoById:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get user information by ID
   *     description: Endpoint to get information of a user by their ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserInfoByIdRequest'
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.userInfoById
);

router.put(
  "/setUserWallet",
  /**
   * @swagger
   * /user/setUserWallet:
   *   put:
   *     tags:
   *       - Authentication
   *     summary: Set user wallet
   *     description: Endpoint to set user's wallet information
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserWalletUpdateRequest'
   *     responses:
   *       '200':
   *         description: User wallet updated successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.setUserWallet
);

router.put(
  "/signedUuid",
  /**
   * @swagger
   * /user/signedUuid:
   *   put:
   *     tags:
   *       - Authentication
   *     summary: Sign UUID
   *     description: Endpoint to sign UUID for user authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignedUuidRequest'
   *     responses:
   *       '200':
   *         description: UUID signed successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.signedUuid
);

router.post(
  "/sendVerifyEmail",
  /**
   * @swagger
   * /user/sendVerifyEmail:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Send verification email
   *     description: Endpoint to send a verification email to the user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VerifyEmailRequest'
   *     responses:
   *       '200':
   *         description: Verification email sent successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.sendVerifyEmail
);

router.post(
  "/verify",
  /**
   * @swagger
   * /user/verify:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Verify user
   *     description: Endpoint to verify user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserVerificationRequest'
   *     responses:
   *       '200':
   *         description: User verified successfully
   *       '401':
   *         description: Unauthorized
   *       '500':
   *         description: Internal server error
   */
  protect,
  AuthController.verify
);

router.post(
  "/authenticateJWT",
  /**
   * @swagger
   * /user/authenticateJWT:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Authenticate JWT
   *     description: Endpoint to authenticate JSON Web Token (JWT)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/JwtAuthenticationRequest'
   *     responses:
   *       '200':
   *         description: JWT authenticated successfully
   *       '401':
   *         description: Unauthorized
   *       '500':
   *         description: Internal server error
   */
  AuthController.AuthenticateJWT
);

router.post(
  "/referral",
  /**
   * @swagger
   * /user/referral:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Verify referral code
   *     description: Endpoint to verify a referral code
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ReferralVerificationRequest'
   *     responses:
   *       '200':
   *         description: Referral code verified successfully
   *       '400':
   *         description: Invalid request body
   *       '401':
   *         description: Unauthorized
   *       '500':
   *         description: Internal server error
   */
  AuthController.verifyReferralCode
);

router.delete(
  "/delete/:uuid",
  /**
   * @swagger
   * /user/delete/{uuid}:
   *   delete:
   *     tags:
   *       - Authentication
   *     summary: Delete user by UUID
   *     description: Endpoint to delete a user by UUID
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         description: UUID of the user to be deleted
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User deleted successfully
   *       '404':
   *         description: User not found
   *       '500':
   *         description: Internal server error
   */
  AuthController.deleteByUUID
);

router.post(
  "/logout",
  /**
   * @swagger
   * /user/logout:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Logout user
   *     description: Endpoint to logout a user
   *     responses:
   *       '200':
   *         description: User logged out successfully
   *       '500':
   *         description: Internal server error
   */
  AuthController.logout
);

router.post(
  "/setStates",
  /**
   * @swagger
   * /user/setStates:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Set states
   *     description: Endpoint to set user states
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StatesSetRequest'
   *     responses:
   *       '200':
   *         description: User states set successfully
   *       '400':
   *         description: Invalid request body
   *       '500':
   *         description: Internal server error
   */
  AuthController.setStates
);

router.post(
  "/setBookmarkStates",
  /**
   * @swagger
   * /user/setBookmarkStates:
   *   post:
   *     tags:
   *       - Authentication
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
  AuthController.setBookmarkStates
);

router.delete(
  "/badge/:id/:uuid",
  /**
   * @swagger
   * /user/badge/{id}/{uuid}:
   *   delete:
   *     tags:
   *       - Authentication
   *     summary: Delete badge by ID and UUID
   *     description: Endpoint to delete a badge by its ID and user UUID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID of the badge to be deleted
   *         schema:
   *           type: string
   *       - in: path
   *         name: uuid
   *         required: true
   *         description: UUID of the user
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Badge deleted successfully
   *       '404':
   *         description: Badge not found
   *       '500':
   *         description: Internal server error
   */
  AuthController.deleteBadgeById
);

router.post(
  "/get-insta-token",
  /**
   * @swagger
   * /user/get-insta-token:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get Instagram token
   *     description: Endpoint to get Instagram token
   *     responses:
   *       '200':
   *         description: Instagram token retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  AuthController.getInstaToken
);

router.post(
  "/getLinkedInUserInfo",
  /**
   * @swagger
   * /user/getLinkedInUserInfo:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get LinkedIn user information
   *     description: Endpoint to get user information from LinkedIn
   *     responses:
   *       '200':
   *         description: LinkedIn user information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  AuthController.getLinkedInUserInfo
);

router.post(
  "/getFacebookUserInfo",
  /**
   * @swagger
   * /user/getFacebookUserInfo:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Get Facebook user information
   *     description: Endpoint to get user information from Facebook
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BookmarkStatesSetRequest'
   *     responses:
   *       '200':
   *         description: Facebook user information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  AuthController.getFacebookUserInfo
);

router.get("/getConstants", AuthController.getVariables)

module.exports = router;
