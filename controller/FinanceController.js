const { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY, BACKEND_URL } = require("../config/env");
const { FinanceSchema, ProviderSchema } = require("../models/Finance")


const connect = async (req, res) => {
  try {
    const { userUuid, uiRedirectUri, code, provider } = req.body;

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

    // Check if provider already exists
    const providerExists = userFinance.providerDetails.some((provider) =>
      {
        if(provider.providerName === "Stripe" && provider.redirectUriId === uiRedirectUri){
          return providerExists;
        }
      }
    );
    if (providerExists) {
      res.status(200).json(
        {
          message: "Stripe is already connected.",
          account: providerExists,
        }
      );
    }
    // Create a new provider model
    const stripeProviderModel = new ProviderSchema({
      providerName: "Stripe",
      redirectUriId: uiRedirectUri
    });

    // Push the new provider to providerDetails array
    userFinance.providerDetails.push(stripeProviderModel);

    // Save the updated userFinance document
    const providerAdded = await userFinance.save();
    if(!providerAdded) throw new Error("Could not add Stripe please try again!")

    res.status(200).json({ redirectToConnect: oauthUrl });
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
  update,
  get,
};
