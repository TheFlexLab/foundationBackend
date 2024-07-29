const express = require("express");
const sessionExpress = require("express-session");
const cookieSession = require("cookie-session");
const cookieParser = require("cookie-parser");
const app = express();
const dotenv = require("dotenv");
const colors = require("colors");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const {
  BASE_PORT,
  FRONTEND_URL,
  FRONTEND_URL_1,
  rpID,
} = require("../config/env");
const passport = require("passport");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("../swagger");
const cronIntialize = require("../service/cron");

const {
  // Authentication
  generateAuthenticationOptions,
  // Registration
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");
const {
  isoBase64URL,
  isoUint8Array,
} = require("@simplewebauthn/server/helpers");
const {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts,
} = require("@simplewebauthn/server");

const {
  AuthenticationResponseJSON,
  AuthenticatorDevice,
  RegistrationResponseJSON,
} = require("@simplewebauthn/types");
// import passport from "passport"
// import '../service/passport'
require("../service/passport");
// require("../service/test")

dotenv.config();

// app.use(cors());

// cron initialize

cronIntialize();

app.use(
  cors({
    origin: FRONTEND_URL.split(","),
    // methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use(
  sessionExpress({
    secret: "somethingsecretgoeshere",
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  })
);
// app.use(
//   cookieSession({ name: "session", keys: ["lama"], maxAge: 24 * 60 * 60 * 100 })
// );

// middlewares
// app.use(cors());
// app.use(cors({
//     origin: FRONTEND_URL,
//     methods: "GET,POST,PUT,DELETE",
//     credentials: true,
//   }));
app.use(cookieParser());

// passport
app.use(passport.initialize());
// app.use(passport.session()) //important because deserializeUser has to decode the information from the session id

app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

// // All Routes
require("../start/routes")(app);

// Serve Swagger documentation
app.use(
  "/foundation-api-documentation-swagger",
  swaggerUI.serve,
  swaggerUI.setup(swaggerSpec)
);

// A unique identifier for your website
// const rpID = rpID;
// The URL at which registrations and authentications should occur
const origin = `https://${rpID}`;

/**
 * Registration (a.k.a. "Registration")
 */
app.get("/generate-registration-options", async (req, res) => {
  // const user = inMemoryUserDeviceDB[loggedInUserId];

  // const {
  //   /**
  //    * The username can be a human-readable name, email, etc... as it is intended only for display.
  //    */
  //   username,
  //   devices,
  // } = user;

  // const opts = {
  //   rpName: 'SimpleWebAuthn Example',
  //   rpID: 'rpID',
  //   // userID: loggedInUserId,
  //   userID: 'userId',
  //   // userName: username,
  //   userName: "username",
  //   timeout: 60000,
  //   attestationType: 'none',
  //   /**
  //    * Passing in a user's list of already-registered authenticator IDs here prevents users from
  //    * registering the same device multiple times. The authenticator will simply throw an error in
  //    * the browser if it's asked to perform registration when one of these ID's already resides
  //    * on it.
  //    */
  //   // excludeCredentials: devices.map((dev) => ({
  //   //   id: dev.credentialID,
  //   //   type: 'public-key',
  //   //   transports: dev.transports,
  //   // })),
  // //   authenticatorSelection: {
  // //     residentKey: 'discouraged',
  // //     /**
  // //      * Wondering why user verification isn't required? See here:
  // //      *
  // //      * https://passkeys.dev/docs/use-cases/bootstrapping/#a-note-about-user-verification
  // //      */
  // //     userVerification: 'preferred',
  // //   },
  // //   /**
  // //    * Support the two most common algorithms: ES256, and RS256
  // //    */
  // //   supportedAlgorithmIDs: [-7, -257],
  //     authenticatorSelection: {
  //       // Defaults
  //       residentKey: 'preferred',
  //       userVerification: 'preferred',
  //       // Optional
  //       authenticatorAttachment: 'platform',
  //     },
  // };

  // const options = await generateRegistrationOptions(opts);

  const options = await generateRegistrationOptions({
    rpName: "SimpleWebAuthn Example",
    rpID: rpID,
    userID: "userID",
    userName: "foundationUser",
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: "none",
    // Prevent users from re-registering existing authenticators
    // excludeCredentials: userAuthenticators.map(authenticator => ({
    //   id: authenticator.credentialID,
    //   type: 'public-key',
    //   // Optional
    //   transports: authenticator.transports,
    // })),
    // See "Guiding use of authenticators via authenticatorSelection" below
    authenticatorSelection: {
      // Defaults
      residentKey: "preferred",
      userVerification: "preferred",
      // Optional
      authenticatorAttachment: "platform",
    },
  });
  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  // req.session.currentChallenge = options.challenge;

  res.send(options);
});

app.post("/verify-registration", async (req, res) => {
  const body = req.body;

  // const user = inMemoryUserDeviceDB[loggedInUserId];

  const expectedChallenge = req.session.currentChallenge;

  let verification;
  try {
    const opts = {
      response: body,
      expectedChallenge: `${req.body.challenge}`,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    };
    verification = await verifyRegistrationResponse(opts);
  } catch (error) {
    const _error = error;
    console.error(_error);
    return res.status(400).send({ error: _error.message });
  }

  const { verified, registrationInfo } = verification;

  // if (verified && registrationInfo) {
  //   const { credentialPublicKey, credentialID, counter } = registrationInfo;

  //   // const existingDevice = user.devices.find((device) =>
  //   //   isoUint8Array.areEqual(device.credentialID, credentialID)
  //   // );

  //   if (!existingDevice) {
  //     /**
  //      * Add the returned device to the user's list of devices
  //      */
  //     const newDevice = {
  //       credentialPublicKey,
  //       credentialID,
  //       counter,
  //       transports: body.response.transports,
  //     };
  //     // user.devices.push(newDevice);
  //   }
  // }

  // req.session.currentChallenge = undefined;

  res.send({ verified });
});

/**
 * Login (a.k.a. "Authentication")
 */
// app.get('/generate-authentication-options', async (req, res) => {
//   // You need to know the user by this point
//   const user = inMemoryUserDeviceDB[loggedInUserId];

//   const opts: GenerateAuthenticationOptionsOpts = {
//     timeout: 60000,
//     allowCredentials: user.devices.map((dev) => ({
//       id: dev.credentialID,
//       type: 'public-key',
//       transports: dev.transports,
//     })),
//     /**
//      * Wondering why user verification isn't required? See here:
//      *
//      * https://passkeys.dev/docs/use-cases/bootstrapping/#a-note-about-user-verification
//      */
//     userVerification: 'preferred',
//     rpID,
//   };

//   const options = await generateAuthenticationOptions(opts);

//   /**
//    * The server needs to temporarily remember this value for verification, so don't lose it until
//    * after you verify an authenticator response.
//    */
//   req.session.currentChallenge = options.challenge;

//   res.send(options);
// });

// app.post('/verify-authentication', async (req, res) => {
//   const body: AuthenticationResponseJSON = req.body;

//   const user = inMemoryUserDeviceDB[loggedInUserId];

//   const expectedChallenge = req.session.currentChallenge;

//   let dbAuthenticator;
//   const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId);
//   // "Query the DB" here for an authenticator matching `credentialID`
//   for (const dev of user.devices) {
//     if (isoUint8Array.areEqual(dev.credentialID, bodyCredIDBuffer)) {
//       dbAuthenticator = dev;
//       break;
//     }
//   }

//   if (!dbAuthenticator) {
//     return res.status(400).send({
//       error: 'Authenticator is not registered with this site',
//     });
//   }

//   let verification: VerifiedAuthenticationResponse;
//   try {
//     const opts: VerifyAuthenticationResponseOpts = {
//       response: body,
//       expectedChallenge: `${expectedChallenge}`,
//       expectedOrigin,
//       expectedRPID: rpID,
//       authenticator: dbAuthenticator,
//       requireUserVerification: false,
//     };
//     verification = await verifyAuthenticationResponse(opts);
//   } catch (error) {
//     const _error = error as Error;
//     console.error(_error);
//     return res.status(400).send({ error: _error.message });
//   }

//   const { verified, authenticationInfo } = verification;

//   if (verified) {
//     // Update the authenticator's counter in the DB to the newest count in the authentication
//     dbAuthenticator.counter = authenticationInfo.newCounter;
//   }

//   req.session.currentChallenge = undefined;

//   res.send({ verified });
// });

module.exports = app;
