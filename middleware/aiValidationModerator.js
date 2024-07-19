const axios = require("axios");
const { OPEN_AI_URL, OPEN_AI_KEY } = require("../config/env");
const { SYSTEM_MESSAGES } = require("../constants");

module.exports = async function (req, res, next) {
  const callType = req.params.callType;
  const userMessage = req.query.userMessage;
  // To check the question and statement not exceeded 500
  if (callType == 1) {
    if (userMessage.length >= 500)
      return res.status(400).json({
        message: "Question / Statement should not exceeded 500 characters",
        status: "ERROR",
      });
  }
  // To check the question and statement not exceeded 500
  if (callType == 2) {
    if (userMessage.length >= 350)
      return res.status(400).json({
        message: "Option should not exceeded 350 characters",
        status: "ERROR",
      });
  }
  const response = await axios.post(
    OPEN_AI_URL,
    {
      model: "gpt-4o-mini",
      // model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: SYSTEM_MESSAGES[3] }, // SYSTEM_MESSAGES[3] -- Prompt to handle the moderator
        { role: "user", content: userMessage },
      ],
      temperature: 0,
      max_tokens: 256,
      top_p: 0.001,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPEN_AI_KEY}`,
      },
    }
  );

  let pureMessageFromGPT = response.data.choices[0].message.content;
  const convertedNumber = Number(pureMessageFromGPT);
  //   To check the give value is only number
  if (typeof convertedNumber === "number" && !isNaN(convertedNumber)) {
    if (convertedNumber >= 0 && convertedNumber <= 100) {
      // To check if the given number is greater than 75
      if (convertedNumber >= 75) {
        return res.json({ message: userMessage, status: "VIOLATION" });
      }
    }
  }
  next();
};
