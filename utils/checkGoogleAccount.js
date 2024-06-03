const dns = require("dns");

module.exports.isGoogleEmail = async (email) => {
  // Extract domain from the email address
  const domain = email.split("@")[1];

  // Perform MX record lookup for the domain
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) {
        reject(err);
      } else {
        // Check if any MX record points to Google
        const isGoogle = addresses.some((mx) => mx.exchange.includes("google"));
        resolve(isGoogle);
      }
    });
  });
};
