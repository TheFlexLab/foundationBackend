const { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY, BACKEND_URL } = require("../config/env");
const { FinanceSchema, ProviderSchema } = require("../models/Finance");
const stripe = require("stripe")(STRIPE_SECRET_KEY)

const checkConnectedAccounts = async (req, res) => {
  try {
    const userUuid = req.params.userUuid;

    const userFinanceExist = await FinanceSchema.findOne({ userUuid: userUuid });
    if (!userFinanceExist) {
      const userFinanceModel = new FinanceSchema({
        userUuid: userUuid,
      })
      const createUserFinance = await userFinanceModel.save();
      if (!createUserFinance) throw new Error("Something went wrong, this must not be happening.");
    }
    const userFinance = await FinanceSchema.findOne({ userUuid: userUuid });
    if (!userFinance) throw new Error("Something went wrong, this must not be happening.");

    if (userFinance.providerDetails.length === 0) {
      res.status(200).json({
        message: "Please connect at least one account for payments.",
        account: userFinance.providerDetails,
      });
    } else {
      res.status(200).json({
        message: "Connected accounts list.",
        account: userFinance.providerDetails,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Something went wrong, Internal Server Error: ${error.message}` });
  }
};

const connect = async (req, res) => {
  try {
    const { userUuid, code, providerName } = req.body;

    const userFinanceExist = await FinanceSchema.findOne({ userUuid: userUuid });
    if (!userFinanceExist) {
      const userFinanceModel = new FinanceSchema({
        userUuid: userUuid,
      })
      const createUserFinance = await userFinanceModel.save();
      if (!createUserFinance) throw new Error("Something went wrong, this must not be happening.");
    }
    const userFinance = await FinanceSchema.findOne({ userUuid: userUuid });
    if (!userFinance) throw new Error("Something went wrong, this must not be happening.");


    if (providerName === "Stripe") {
      const stripeUserData = await this.stripe.oauth.token({
        grant_type: 'authorization_code',
        code,
      });

      const stripeAccountId = stripeUserData.stripe_user_id;

      const providerIndex = userFinance.providerDetails.findIndex(provider =>
        provider.providerName === providerName
      );

      if (providerIndex !== -1) {
        userFinance.providerDetails[providerIndex].accountId = stripeAccountId;
        // Set isConnected to true for the matched provider and false for all others
        userFinance.providerDetails.forEach((provider, index) => {
          provider.isConnected = (index === providerIndex);
        });
      }
      else {
        // Set `isConnected` to false for all existing documents in `providerDetails`
        userFinance.providerDetails.forEach(provider => {
          provider.isConnected = false;
        });
        const userStripeModel = new ProviderSchema({
          providerName: providerName,
          accountId: stripeAccountId
        })
        userFinance.providerDetails.push(userStripeModel)
      }

      await userFinance.save();

      res.status(200).json({
        message: "Account is connected.",
        account: userFinance.providerDetails,
      });
    }
    else if (providerName === "Paypal") {
      const paypalUserData = await this.stripe.oauth.token({
        grant_type: 'authorization_code',
        code,
      });

      const paypalAccountId = paypalUserData.paypal_user_id;

      const providerIndex = userFinance.providerDetails.findIndex(provider =>
        provider.providerName === providerName
      );

      if (providerIndex !== -1) {
        userFinance.providerDetails[providerIndex].accountId = paypalAccountId;
        // Set isConnected to true for the matched provider and false for all others
        userFinance.providerDetails.forEach((provider, index) => {
          provider.isConnected = (index === providerIndex);
        });
      }
      else {
        // Set `isConnected` to false for all existing documents in `providerDetails`
        userFinance.providerDetails.forEach(provider => {
          provider.isConnected = false;
        });
        const userStripeModel = new ProviderSchema({
          providerName: providerName,
          accountId: paypalAccountId
        })
        userFinance.providerDetails.push(userStripeModel)
      }

      await userFinance.save();

      res.status(200).json({
        message: "Account is connected.",
        account: userFinance.providerDetails,
      });
    }
    else {
      throw new Error(`Provider: ${providerName} is not supported.`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Something went wrong, Internal Server Error: ${error.message}` });
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
  connect,
  checkConnectedAccounts,
  update,
  get,
};
