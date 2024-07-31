const passport = require("passport");
const express = require("express");
const router = express.Router();
// controller
const PassportController = require("../controller/PassportController");
// middleware
const protect = require("../middleware/protect");
const cache = require("../middleware/cache");
const { FRONTEND_URL } = require("../config/env");

const CLIENT_URL = `${FRONTEND_URL}/profile/verification-badges`;

/**
 * @swagger
 * tags:
 *   name: Pasport
 *   description: Endpoints for authentication using third-party providers
 */

router.get(
  "/login/failed",
  /**
   * @swagger
   * /auth/login/failed:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Failed login
   *     description: Endpoint to handle failed login attempts
   *     responses:
   *       '401':
   *         description: Unauthorized - login failure
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: failure
   */
  (req, res) => {
    res.status(401).json({
      success: false,
      message: "failure",
    });
  }
);

// Github
router.get(
  "/github",
  /**
   * @swagger
   * /auth/github:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with GitHub
   *     description: Endpoint to initiate authentication with GitHub
   *     responses:
   *       '302':
   *         description: Redirect to GitHub authentication page
   */
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  /**
   * @swagger
   * /auth/github/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: GitHub authentication callback
   *     description: Endpoint to handle callback after GitHub authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("github", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

// LinkedIn
router.get(
  "/linkedin",
  /**
   * @swagger
   * /auth/linkedin:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with LinkedIn
   *     description: Endpoint to initiate authentication with LinkedIn
   *     responses:
   *       '302':
   *         description: Redirect to LinkedIn authentication page
   */
  passport.authenticate("linkedin")
);

router.get(
  "/linkedin/callback",
  /**
   * @swagger
   * /auth/linkedin/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: LinkedIn authentication callback
   *     description: Endpoint to handle callback after LinkedIn authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("linkedin", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

// Twitter
router.get(
  "/twitter",
  /**
   * @swagger
   * /auth/twitter:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with Twitter
   *     description: Endpoint to initiate authentication with Twitter
   *     responses:
   *       '302':
   *         description: Redirect to Twitter authentication page
   */
  passport.authenticate("twitter", {
    forceLogin: true,
    screenName: "",
  })
);

router.get(
  "/twitter/callback",
  /**
   * @swagger
   * /auth/twitter/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Twitter authentication callback
   *     description: Endpoint to handle callback after Twitter authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("twitter", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

// Instagram
router.get(
  "/instagram",
  /**
   * @swagger
   * /auth/instagram:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with Instagram
   *     description: Endpoint to initiate authentication with Instagram
   *     responses:
   *       '302':
   *         description: Redirect to Instagram authentication page
   */
  passport.authenticate("instagram")
);

router.get(
  "/instagram/callback",
  /**
   * @swagger
   * /auth/instagram/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Instagram authentication callback
   *     description: Endpoint to handle callback after Instagram authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("instagram", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

// Auth Success
router.get(
  "/login/success",
  protect,
  /**
   * @swagger
   * /auth/login/success:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Successful login
   *     description: Endpoint to handle successful login
   *     responses:
   *       '200':
   *         description: Successful login response
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessfulLoginResponse'
   */
  (req, res) => {
    if (req.user) {
      res.status(200).json({
        success: true,
        message: "successful",
        user: req.user,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
  }
);

// Google
router.get(
  "/google",
  /**
   * @swagger
   * /auth/google:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with Google
   *     description: Endpoint to initiate authentication with Google
   *     responses:
   *       '302':
   *         description: Redirect to Google authentication page
   */
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  /**
   * @swagger
   * /auth/google/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Google authentication callback
   *     description: Endpoint to handle callback after Google authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("google", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

// FACEBOOK
router.get(
  "/facebook",
  /**
   * @swagger
   * /auth/facebook:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Authenticate with Facebook
   *     description: Endpoint to initiate authentication with Facebook
   *     responses:
   *       '302':
   *         description: Redirect to Facebook authentication page
   */

  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  /**
   * @swagger
   * /auth/facebook/callback:
   *   get:
   *     tags:
   *       - Pasport
   *     summary: Facebook authentication callback
   *     description: Endpoint to handle callback after Facebook authentication
   *     responses:
   *       '302':
   *         description: Redirect to client URL
   */
  (req, res, next) => {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}`);
    }
    next();
  },
  passport.authenticate("facebook", {
    failureRedirect: CLIENT_URL,
    session: false,
  }),
  PassportController.oauthSuccessHandler
);

module.exports = router;
