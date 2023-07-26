require("dotenv").config();
const express = require("express");
const request = require("request-promise-native");
const NodeCache = require("node-cache");
const session = require("express-session");
const opn = require("open");
const app = express();
const matches = [];
const SKU = require("../sku.js");

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

const hello = () => {
  console.log("helllo");
};

const getAllProductSKU = async (accessToken) => {
  console.log("");
  console.log(
    "=== Retrieving a contact from HubSpot using the access token ==="
  );
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    console.log(
      "===> Replace the following request.get() to test other API calls"
    );
    console.log(
      "===> request.get('https://api.hubapi.com/contacts/v1/lists/all/contacts/all?count=1')"
    );
    const result = await request.get(
      "https://api.hubapi.com/crm-objects/v1/objects/products/paged?properties=hs_sku",
      {
        headers: headers,
      }
    );

    console.log("Obtained SKU'S from product page, here is one");
    x = JSON.parse(result);
    console.log(x.objects[0].properties.hs_sku.value);

    return JSON.parse(result);
  } catch (e) {
    console.error("  > Unable to retrieve contact");
    return JSON.parse(e.response.body);
  }
};

const MatchSKUs_GetProductid = (res, ProductPageSKUs) => {
  if (ProductPageSKUs.status === "error") {
    res.write(
      `<p>Unable to retrieve contact! Error Message: ${ProductPageSKUs.message}</p>`
    );
    return;
  }

  //compares product page SKU values to our array of the SKU values we want,
  //then adds product ID of matching SKU's
  for (let i = 0; i < SKU.length; i++) {
    for (let j = 0; j < ProductPageSKUs.objects.length; j++) {
      if (SKU[i] == ProductPageSKUs.objects[j].properties.hs_sku.value) {
        matches.push(ProductPageSKUs.objects[j].objectId);
        console.log(
          "SKU VALUE:",
          SKU[i],
          "matches with:",
          ProductPageSKUs.objects[j].properties.hs_sku.value,
          "adding product id:",
          ProductPageSKUs.objects[j].objectId,
          "to array that will be used for creation"
        );
      } else {
        console.log(
          "no found",
          SKU[i],
          ProductPageSKUs.objects[j].properties.hs_sku.value
        );
      }
    }
  }

  res.write(`<p>Contact name: ${ProductPageSKUs}  </p>`);
};

module.exports = {
  hello,
  getAllProductSKU,
  MatchSKUs_GetProductid,
};
