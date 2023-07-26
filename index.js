require("dotenv").config();
const express = require("express");
const request = require("request-promise-native");
const NodeCache = require("node-cache");
const session = require("express-session");
const opn = require("open");
const app = express();
const SKU = require("./sku.js");
const PORT = 3000;
const matches = [];

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

const {
  hello,
  getAllProductSKU,
  MatchSKUs_GetProductid,
} = require("./modules/datahandling.js");

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Missing CLIENT_ID or CLIENT_SECRET environment variable.");
}

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// To request others, set the SCOPE variable for scope of hubspot INSTALL URL
let SCOPES = process.env.SCOPE;
if (process.env.SCOPE) {
  SCOPES = process.env.SCOPE.split(/ |, ?|%20/).join(" ");
}

// On successful install, users will be redirected to /oauth-callback
const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`;

//===========================================================================//

// Use a session to keep track of client ID
app.use(
  session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true,
  })
);

//   Running the OAuth 2.0 Flow

// Step 1
// Build the authorization URL to redirect a user
// to when they choose to install the app
const authUrl =
  "https://app.hubspot.com/oauth/authorize" +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` + // app's client ID
  `&scope=${encodeURIComponent(SCOPES)}` + // scopes being requested by the app
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`; // where to send the user after the consent page

// Redirect the user from the installation page to
// the authorization URL
app.get("/install", (req, res) => {
  console.log("");
  console.log("=== Initiating OAuth 2.0 flow with HubSpot ===");
  console.log("");
  console.log("===> Step 1: Redirecting user to your app's OAuth URL");
  res.redirect(authUrl);
  console.log("===> Step 2: User is being prompted for consent by HubSpot");
});

// Step 2
// The user is prompted to give the app access to the requested
// resources. This is all done by HubSpot, so no work is necessary
// on the app's end

// Step 3
// Receive the authorization code from the OAuth 2.0 Server,
// and process it based on the query parameters that are passed
app.get("/oauth-callback", async (req, res) => {
  console.log("===> Step 3: Handling the request sent by the server");

  // Received a user authorization code, so now combine that with the other
  // required values and exchange both for an access token and a refresh token
  if (req.query.code) {
    console.log("       > Received an authorization token");

    const authCodeProof = {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: req.query.code,
    };

    // Step 4
    // Exchange the authorization code for an access token and refresh token
    console.log(
      "===> Step 4: Exchanging authorization code for an access token and refresh token"
    );
    const token = await exchangeForTokens(req.sessionID, authCodeProof);
    if (token.message) {
      return res.redirect(`/error?msg=${token.message}`);
    }

    // Once the tokens have been retrieved, use them to make a query
    // to the HubSpot API
    res.redirect(`/`);
  }
});

//Exchanging Proof for an Access Token

const exchangeForTokens = async (userId, exchangeProof) => {
  try {
    const responseBody = await request.post(
      "https://api.hubapi.com/oauth/v1/token",
      {
        form: exchangeProof,
      }
    );
    // Usually, this token data should be persisted in a database and associated with
    // a user identity.
    const tokens = JSON.parse(responseBody);
    refreshTokenStore[userId] = tokens.refresh_token;
    accessTokenCache.set(
      userId,
      tokens.access_token,
      Math.round(tokens.expires_in * 0.75)
    );

    console.log(" Received an access token and refresh token");
    return tokens.access_token;
  } catch (e) {
    console.error(
      `       > Error exchanging ${exchangeProof.grant_type} for access token`
    );
    return JSON.parse(e.response.body);
  }
};

const refreshAccessToken = async (userId) => {
  const refreshTokenProof = {
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    refresh_token: refreshTokenStore[userId],
  };
  return await exchangeForTokens(userId, refreshTokenProof);
};

const getAccessToken = async (userId) => {
  // If the access token has expired, retrieve
  // a new one using the refresh token
  if (!accessTokenCache.get(userId)) {
    console.log("Refreshing expired access token");
    await refreshAccessToken(userId);
  }
  return accessTokenCache.get(userId);
};

const isAuthorized = (userId) => {
  return refreshTokenStore[userId] ? true : false;
};

//Using an Access Token to Query the HubSpot API

//========================================//
//   Displaying information to the user   //
//========================================//

const AddItems = async (accessToken) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  //This is the data for the line item, changing product id value changes the product being targeted

  const requestData = [
    {
      name: "hs_product_id",
      value: "2173354556",
    },
    {
      name: "quantity",
      value: "50",
    },
  ];
  //sends post request to generate the line item, holds the object id that is returned for the put assocation

  const x = await request(
    "https://api.hubapi.com/crm-objects/v1/objects/line_items",
    {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: headers,
    }
  );
  y = JSON.parse(x);
  objectId = y.objectId;

  //associates the generated line item based on the object ID

  console.log("line item created");

  //uses objectID from lineitem post request to

  const assocdata = {
    fromObjectId: objectId,
    toObjectId: 14234926682,
    category: "HUBSPOT_DEFINED",
    definitionId: 20,
  };

  //sends put request
  fetch("https://api.hubapi.com/crm-associations/v1/associations", {
    method: "PUT",
    body: JSON.stringify(assocdata),
    headers: headers,
  }).then(console.log("association success"));
};

//--------------------------- ACTS AS MAIN METHOD ----------------------------
app.get("/", async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.write(`<h2>HubSpot OAuth 2.0 Quickstart App</h2>`);
  if (isAuthorized(req.sessionID)) {
    hello();
    const accessToken = await getAccessToken(req.sessionID);
    //returns
    const ProductPageSKUs = await getAllProductSKU(accessToken);
    res.write(`<h4>Access token: ${accessToken}</h4>`);
    //Takes in all productpage data, compares all the SKU's in the product page to
    //our array of the SKU'S we want, and returns nothing right now, but
    //will later return all the object ID's of the SKU's that match so we can make a deal from them
    MatchSKUs_GetProductid(res, ProductPageSKUs);
    //adds lineitems and assocaites them with the correct deal
    AddItems(accessToken);
  } else {
    res.write(`<a href="/install"><h3>Install the app</h3></a>`);
  }
  res.end();
});

app.get("/error", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

app.listen(PORT, () =>
  console.log(`=== Starting your app on http://localhost:${PORT} ===`)
);
opn(`http://localhost:${PORT}`);
