var cron = require("node-cron");
const LedgerController = require("../controller/LedgerController");

module.exports = cronIntialize = () => {

  // console.log("Cron initialized successfully");
  

  // */1 * * * * * -- Run At every 2 second
  // 0 10 * * 5  ---  Run every Friday at 10 AM 
  // 0 10 * * 1  ---  Run every Monday at 10 AM 


  cron.schedule("0 10 * * 5", () => {
    LedgerController.getLstActAndEmailForAllUsers()
  });
}

