const { STATEMENT, MASTER_ARRAY_TOPICS } = require("../constants");
const User = require("../models/UserModel");
const crypto = require("crypto");
const { createLedger } = require("../utils/createLedger");
const QuestTopics = require("../models/QuestTopics");
const { ToWords } = require('to-words');

const numberToWord = new ToWords({localeCode: "en-US"});


module.exports.checkViolationInSentence = (sentence) => {
  const lowerCaseSentence = sentence.toLowerCase();
  return STATEMENT.some((statement) =>
    lowerCaseSentence.includes(statement.toLowerCase())
  );
};

module.exports.capitalizeFirstLetter = (sentence) => {
  if (sentence.length === 0) {
    return sentence;
  }

  const firstLetter = sentence.charAt(0).toUpperCase();
  const restOfSentence = sentence.slice(1);

  return firstLetter + restOfSentence;
};


module.exports.removeTrailingPeriods = (sentence) => {
  const regex = /\.*$/;
  return sentence.replace(regex, "");
};

module.exports.removeCorrected = (inputString) => {
  const regex = /Corrected: /gi;
  return inputString.replace(regex, "");
};


module.exports.replaceWithPeriod = (inputString) => {
  //console.log(": AiValidation.js:43 ~ inputString:", inputString)
  // Use a regular expression to check the last character
  const regex = /[^\s.]$/;
  
  // If the last character is not a period or whitespace, add a period
  if (regex.test(inputString)) {
    return inputString + '.';
  }
  
  // Otherwise, return the input string as is
  return inputString;
}


module.exports.extractAlphabetic = (inputString) => {
  // Use a regular expression to match alphabetic characters
  const alphabeticCharacters = inputString.match(/[a-zA-Z]+/g);

  // Check if alphabetic characters are found
  if (alphabeticCharacters) {
    const resultString = alphabeticCharacters.join(''); // Join the matched characters
    return resultString;
  } else {
    return "No alphabetic characters found";
  }
}



module.exports.removeTrailingQuestionMarks = (sentence) => {
  const regex = /\?*$/;
  return sentence.replace(regex, "");
};

module.exports.incrementCounter = async(req, res, data) => {
  try {
    // const result = await User.updateOne(
    //   { uuid: req.user.uuid },
    //   { $inc: { violationCounter: 1 } }
    //   );
    // if (result?.nModified === 0) {
    //   return res.status(404).send("User not found");
    // }
    // Create Ledger
    await createLedger(
    {
      uuid : req.user.uuid,
      txUserAction : "violationCoC",
      txID : crypto.randomBytes(11).toString("hex"),
      txAuth : "User",
      txFrom : req.user.uuid,
      txTo : "dao",
      txAmount : "0",
      txData : data,
      // txDescription : "User triggered a CoC violation"
    })
    // return res.status(200).send(result);
    return res.status(200);
  } catch (error) {
    return res.status(500);
  }
};

module.exports.removeQuotes = (sentence) => {
  if (sentence.startsWith('"') && sentence.endsWith('"')) {
      return sentence.slice(1, -1);
  }
  return sentence;
}

module.exports.isAllNumbers = (input) => {
  return /^\d+$/.test(input);
}

module.exports.createQuestTopic = async(topic) => {
  try {
    const checkQuestTopic = await QuestTopics.findOne({ name: topic })
    if(checkQuestTopic) return
    const questTopic = await new QuestTopics({ name: topic })
    await questTopic.save()
  } catch (error) {
    //console.log(error);
  }
}

module.exports.checkTopicMasterArray = (topic) => {
  try {
    const checkQuestTopic = MASTER_ARRAY_TOPICS.includes(topic);
    if(checkQuestTopic){
      return topic
    } else {
      return "Other"
    }
  } catch (error) {
    //console.log(error);
  }
}

module.exports.capitalizeSentence = (sentence) => {
  try {
    // Split the sentence into an array of words
    let words = sentence.split(' ');
    
    // Capitalize the first letter of each word
    for (let i = 0; i < words.length; i++) {
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
  
    // Join the words back together to form the capitalized sentence
    return words.join(' ');
  } catch (error) {
    //console.log(error);
  }
}


module.exports.checkNonsenseInTopics = (sentence) => {
  const statements = [
      "Topic category: Unclear"
	];

  const lowerCaseSentence = sentence.toLowerCase();
  return statements.some(statement => lowerCaseSentence.includes(statement.toLowerCase()));
}

module.exports.numberToWords = (sentence) => {
   // Regular expression to match numbers in the sentence
   const regex = /(\d+,\d+|\d+)(\.\d+)?/g;
  
    // Extract numbers from the sentence
    const numbers = sentence.match(regex);
  
    if (numbers) {
      // Perform calculations on each number
      const updatedNumbers = numbers.map((num) => {
        return numberToWord.convert(parseFloat(num.replace(/,/g, '')))
      });
  
      // Replace the original numbers with the updated ones in the sentence
      const updatedSentence = sentence.replace(regex, () => updatedNumbers.shift());
  
      return updatedSentence;
    }
  
    return sentence; // Return the original sentence if no numbers are found
};

module.exports.extractAndSanitizeDollar = (sentence) => {
 // Use a regular expression to match symbols
 const symbolRegex = /[$]/g;
 const sanitizedSentence = sentence.replace(symbolRegex, '');

 return sanitizedSentence;
};