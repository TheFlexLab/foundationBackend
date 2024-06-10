const { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY, BACKEND_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY } = require("../config/env");
const Treasury = require("../models/Treasury");
const { PaymentSchema, ProviderSchema } = require("../models/Payment");
const { createLedger } = require("../utils/createLedger");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices");
const crypto = require("crypto");

// Finance
const stripe = require("stripe")(STRIPE_SECRET_KEY)
const { TWO_POINT_FIVE_DOLLARS_EQUALS_TO_ONE_FDX } = require("../constants");
const paypal = require('paypal-rest-sdk');
// PayPal configuration
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': PAYPAL_CLIENT_ID,
  'client_secret': PAYPAL_SECRET_KEY
});
const base = "https://api-m.sandbox.paypal.com";

// const checkConnectedAccounts = async (req, res) => {
//   try {
//     const userUuid = req.params.userUuid;

//     const userFinanceExist = await FinanceSchema.findOne({ userUuid: userUuid });
//     if (!userFinanceExist) {
//       const userFinanceModel = new FinanceSchema({
//         userUuid: userUuid,
//       })
//       const createUserFinance = await userFinanceModel.save();
//       if (!createUserFinance) throw new Error("Something went wrong, this must not be happening.");
//     }
//     const userFinance = await FinanceSchema.findOne({ userUuid: userUuid });
//     if (!userFinance) throw new Error("Something went wrong, this must not be happening.");

//     if (userFinance.providerDetails.length === 0) {
//       res.status(200).json({
//         message: "Please connect at least one account for payments.",
//         account: userFinance.providerDetails,
//       });
//     } else {
//       res.status(200).json({
//         message: "Connected accounts list.",
//         account: userFinance.providerDetails,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: `Something went wrong, Internal Server Error: ${error.message}` });
//   }
// };

// const connect = async (req, res) => {
//   try {
//     const { userUuid, code, providerName } = req.body;

//     const userFinanceExist = await FinanceSchema.findOne({ userUuid: userUuid });
//     if (!userFinanceExist) {
//       const userFinanceModel = new FinanceSchema({
//         userUuid: userUuid,
//       })
//       const createUserFinance = await userFinanceModel.save();
//       if (!createUserFinance) throw new Error("Something went wrong, this must not be happening.");
//     }
//     const userFinance = await FinanceSchema.findOne({ userUuid: userUuid });
//     if (!userFinance) throw new Error("Something went wrong, this must not be happening.");


//     if (providerName === "Stripe") {
//       const stripeUserData = await this.stripe.oauth.token({
//         grant_type: 'authorization_code',
//         code,
//       });

//       const stripeAccountId = stripeUserData.stripe_user_id;

//       const providerIndex = userFinance.providerDetails.findIndex(provider =>
//         provider.providerName === providerName
//       );

//       if (providerIndex !== -1) {
//         userFinance.providerDetails[providerIndex].accountId = stripeAccountId;
//         // Set isConnected to true for the matched provider and false for all others
//         userFinance.providerDetails.forEach((provider, index) => {
//           provider.isConnected = (index === providerIndex);
//         });
//       }
//       else {
//         // Set `isConnected` to false for all existing documents in `providerDetails`
//         userFinance.providerDetails.forEach(provider => {
//           provider.isConnected = false;
//         });
//         const userStripeModel = new ProviderSchema({
//           providerName: providerName,
//           accountId: stripeAccountId
//         })
//         userFinance.providerDetails.push(userStripeModel)
//       }

//       await userFinance.save();

//       res.status(200).json({
//         message: "Account is connected.",
//         account: userFinance.providerDetails,
//       });
//     }
//     else if (providerName === "Paypal") {
//       const paypalUserData = await this.stripe.oauth.token({
//         grant_type: 'authorization_code',
//         code,
//       });

//       const paypalAccountId = paypalUserData.paypal_user_id;

//       const providerIndex = userFinance.providerDetails.findIndex(provider =>
//         provider.providerName === providerName
//       );

//       if (providerIndex !== -1) {
//         userFinance.providerDetails[providerIndex].accountId = paypalAccountId;
//         // Set isConnected to true for the matched provider and false for all others
//         userFinance.providerDetails.forEach((provider, index) => {
//           provider.isConnected = (index === providerIndex);
//         });
//       }
//       else {
//         // Set `isConnected` to false for all existing documents in `providerDetails`
//         userFinance.providerDetails.forEach(provider => {
//           provider.isConnected = false;
//         });
//         const userStripeModel = new ProviderSchema({
//           providerName: providerName,
//           accountId: paypalAccountId
//         })
//         userFinance.providerDetails.push(userStripeModel)
//       }

//       await userFinance.save();

//       res.status(200).json({
//         message: "Account is connected.",
//         account: userFinance.providerDetails,
//       });
//     }
//     else {
//       throw new Error(`Provider: ${providerName} is not supported.`);
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: `Something went wrong, Internal Server Error: ${error.message}` });
//   }
// };

const getStripePaymentIntent = async (req, res) => {
  const { amount, currency } = req.body;

  const checkTreasury = await Treasury.findOne();
  if (!checkTreasury) throw new Error(`Treasury is not found, FDX can't be purchased.`);

  const fdxRequired = amount * 2;
  if (Math.round(checkTreasury.amount) <= fdxRequired || Math.round(checkTreasury.amount) <= 0) throw new Error(`Treasury is not enough, FDX can't be purchased.`)

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: currency,
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.status(200).json({
    clientSecret: paymentIntent.client_secret,
  });
}

const spay = async (req, res) => {
  try {
    const { charge, userUuid } = req.body;

    // const checkTreasury = await Treasury.findOne();
    // if (!checkTreasury) throw new Error(`Treasury is not found, FDX can't be purchased.`);

    const dollars = (charge.amount / 100);
    const fdxRequired = dollars / TWO_POINT_FIVE_DOLLARS_EQUALS_TO_ONE_FDX;
    // if (Math.round(checkTreasury.amount) <= fdxRequired || Math.round(checkTreasury.amount) <= 0) throw new Error(`Treasury is not enough, FDX can't be purchased.`)

    const userPaymentExist = await PaymentSchema.findOne({ userUuid: userUuid });
    if (!userPaymentExist) {
      const userPaymentModel = new PaymentSchema({
        userUuid: userUuid,
      })
      const createUserPayment = await userPaymentModel.save();
      if (!createUserPayment) throw new Error("Something went wrong, this must not be happening.");
      const providerDetails = new ProviderSchema({
        providerName: "Stripe",
        details: charge,
      })
      createUserPayment.providerDetails.push(providerDetails);
      await userPaymentExist.save();
    }
    else {
      const providerDetails = new ProviderSchema({
        providerName: "Stripe",
        details: charge,
      })
      userPaymentExist.providerDetails.push(providerDetails);
      await userPaymentExist.save();
    }

    await createLedger({
      uuid: userUuid,
      txUserAction: "fdxPurchased",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: userUuid,
      txAmount: parseFloat(fdxRequired),
      // txData : user.badges[0]._id,
      txDescription : "FDX are purchased"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: parseFloat(fdxRequired), dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: userUuid,
      amount: parseFloat(fdxRequired),
      inc: true,
    });

    res.status(200).send({
      message: `${parseFloat(fdxRequired)} FDX coins are transferd to your account please check your balance.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
};

// Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET_KEY,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};


// Generate a client token for rendering the hosted card fields.
const generateClientToken = async () => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v1/identity/generate-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

// return client token for hosted-fields component
const ppayToken = async (req, res) => {
  try {
    const { jsonResponse, httpStatusCode } = await generateClientToken();
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    res.status(500).send({ error: "Failed to generate client token." });
  }
};

const createOrder = async (amount) => {

  const checkTreasury = await Treasury.findOne();
  if (!checkTreasury) throw new Error(`Treasury is not found, FDX can't be purchased.`);

  const fdxRequired = amount * 2;
  if (Math.round(checkTreasury.amount) <= fdxRequired || Math.round(checkTreasury.amount) <= 0) throw new Error(`Treasury is not enough, FDX can't be purchased.`)

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: amount,
        },
      },
    ],
  };

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

const order = async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { amount } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(amount);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
}

const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

const captureOrderCall = async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
};

const ppay = async (req, res) => {
  try {
    const { charge, userUuid } = req.body;

    // const checkTreasury = await Treasury.findOne();
    // if (!checkTreasury) throw new Error(`Treasury is not found, FDX can't be purchased.`);

    const dollars = charge.purchase_units[0].payments.captures[0].amount.value;
    const fdxRequired = dollars / TWO_POINT_FIVE_DOLLARS_EQUALS_TO_ONE_FDX;
    // if (Math.round(checkTreasury.amount) <= fdxRequired || Math.round(checkTreasury.amount) <= 0) throw new Error(`Treasury is not enough, FDX can't be purchased.`)

    const userPaymentExist = await PaymentSchema.findOne({ userUuid: userUuid });
    if (!userPaymentExist) {
      const userPaymentModel = new PaymentSchema({
        userUuid: userUuid,
      })
      const createUserPayment = await userPaymentModel.save();
      if (!createUserPayment) throw new Error("Something went wrong, this must not be happening.");
      const providerDetails = new ProviderSchema({
        providerName: "PayPal",
        details: charge,
      })
      createUserPayment.providerDetails.push(providerDetails);
      await userPaymentExist.save();
    }
    else {
      const providerDetails = new ProviderSchema({
        providerName: "PayPal",
        details: charge,
      })
      userPaymentExist.providerDetails.push(providerDetails);
      await userPaymentExist.save();
    }

    await createLedger({
      uuid: userUuid,
      txUserAction: "fdxPurchased",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: userUuid,
      txAmount: parseFloat(fdxRequired),
      // txData : user.badges[0]._id,
      txDescription : "FDX are purchased"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: parseFloat(fdxRequired), dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: userUuid,
      amount: parseFloat(fdxRequired),
      inc: true,
    });

    res.status(200).send({
      message: `${parseFloat(fdxRequired)} FDX coins are transferd to your account please check your balance.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
};

const update = async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: `An error occurred while update Ledger: ${error.message}`,
      });
  }
};

const get = async (req, res) => {
  try {
    const getTreasury = await Treasury.findOne();
    res.status(200).json({
      data: getTreasury?.amount?.toString(),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: ` An error occurred while get Treasury: ${error.message}`,
      });
  }
};

module.exports = {
  // connect,
  // checkConnectedAccounts,
  getStripePaymentIntent,
  spay,
  ppayToken,
  order,
  captureOrderCall,
  ppay,
  update,
  get,
};
