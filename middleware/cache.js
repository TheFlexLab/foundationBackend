const cache = require("memory-cache");

// Cache responses for 8 minutes (480 seconds)
module.exports = function (req, res, next) {
  // Convert the URL to lowercase to ensure case insensitivity
  const key = "__express__" + (req.originalUrl || req.url).toLowerCase();
  const cachedResponse = cache.get(key);
  if (cachedResponse) {
    // Parse the cached response as JSON
    const parsedResponse = JSON.parse(cachedResponse);
    console.log("If", parsedResponse);
    res.json(parsedResponse);
  } else {
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      // Serialize the response as JSON when caching
      const jsonBody = JSON.stringify(body);
      cache.put(key, jsonBody, 480 * 1000); // Cache for 8 minutes
      sendJson(body);
    };
    console.log("Else", sendJson);
    next();
  }
};
