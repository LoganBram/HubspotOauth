require("dotenv").config();
const request = require("request-promise-native");
const NodeCache = require("node-cache");
const matches = [];
const SKU = require("../sku.js");

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

const hello = () => {
  console.log("hello");
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

//takes the productpage of SKU's and compares to SKU's passed to us from pricesheet
//returns all object id's of the products via the SKU comparison
//object ID's are used to create line items with the correct item
const MatchSKUs_GetProductid = (res, SKU, ProductPageSKUs) => {
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
          "NOT MATCHED",
          SKU[i],
          ProductPageSKUs.objects[j].properties.hs_sku.value
        );
      }
    }
  }
  res.write(`<p>Contact name: ${SKU}  </p>`);
  res.write(`<p>Contact name: ${ProductPageSKUs}  </p>`);
};

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

module.exports = {
  hello,
  getAllProductSKU,
  MatchSKUs_GetProductid,
  AddItems,
};
