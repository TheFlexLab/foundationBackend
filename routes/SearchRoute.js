const express = require("express");
const router = express.Router();
// controller
const SearchController = require("../controller/SearchController");
// middleware
const protect = require("../middleware/protect");

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Endpoints for searching various entities
 */

router.post("/easySearch/:term?",
  /**
   * @swagger
   * /search/easySearch:
   *   post:
   *     tags:
   *       - Search
   *     summary: Easy search
   *     description: Endpoint for easy search functionality
   *     parameters:
   *       - in: query
   *         name: term
   *         required: false
   *         schema:
   *           type: string
   *         description: ID of the post (optional)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful easy search
   *       '500':
   *         description: Internal server error
   */
  SearchController.easySearch
);

// Not being use at FE, Send `req.body.uuid` in body 1st
router.post("/searchBookmarks",
  /**
   * @swagger
   * /search/searchBookmarks:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search bookmarks
   *     description: Endpoint for searching bookmarks
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for bookmarks
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchBookmarks
);

// Not being use at FE, Send `req.body.uuid` in body 1st
router.post("/searchHiddenQuest",
  /**
   * @swagger
   * /search/searchHiddenQuest:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search hidden quests
   *     description: Endpoint for searching hidden quests
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for hidden quests
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchHiddenQuest
);

router.post("/searchCities",
  /**
   * @swagger
   * /search/searchCities:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search cities
   *     description: Endpoint for searching cities
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for cities
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchCities
);

router.post("/searchUniversities",
  /**
   * @swagger
   * /search/searchUniversities:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search universities
   *     description: Endpoint for searching universities
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for universities
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchUniversities
);

router.post("/searchCompanies",
  /**
   * @swagger
   * /search/searchCompanies:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search companies
   *     description: Endpoint for searching companies
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for companies
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchCompanies
);

router.post("/searchJobTitles",
  /**
   * @swagger
   * /search/searchJobTitles:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search job titles
   *     description: Endpoint for searching job titles
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for job titles
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchJobTitles
);

router.post("/searchDegreesAndFields",
  /**
   * @swagger
   * /search/searchDegreesAndFields:
   *   post:
   *     tags:
   *       - Search
   *     summary: Search degrees and fields
   *     description: Endpoint for searching degrees and fields
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SearchInput'
   *     responses:
   *       '200':
   *         description: Successful search for degrees and fields
   *       '500':
   *         description: Internal server error
   */
  SearchController.searchDegreesAndFields
);


module.exports = router;
