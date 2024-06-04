const { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY } = require("../config/env");
const { BACKEND_URL } = require("../config/env");


const connectStripe = async (req, res) => {
  try {
    const { amount } = req.query;
    const treasuryEntry = new Treasury({ amount });
    const savedTreasury = await treasuryEntry.save();
    if (!savedTreasury) throw new Error("Treasury Not Created Successfully!");
    res.status(201).json({ data: savedTreasury });
  } catch (error) {
    console.error(error);
    res.status(500).json({message: `Something went wrong, Internal Server Error: ${error.message}`});
  }
};

const update = async (req, res) => {
  try {
    const {userUuid, uiRedirectUri } = req.params;
    const BackEndUrl = process.env.BACKEND_URL ?? 'https://0e94-39-62-31-68.ngrok-free.app';
    const clientId = STRIPE_CLIENT_ID;
    const redirectUri = `${BackEndUrl}/candor/stripe/account/callback/`;
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${userUuid}`;
    const redirectUrl = await this.stripeService.createStripeUser({
      userId: userId,
      redirectUri: redirectString,
    });
    res.status(200).json({ URL: oauthUrl });
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
  create,
  update,
  get,
};
