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
//gets all SKU values from product page on hubspot
const getAllProductSKU = async (accessToken) => {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
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
  console.log("hello", ProductPageSKUs);

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
  return matches;
};

//takes in array of object id's that have been filtered for only the ones to add
const AddItems = async (accessToken, ItemArray_OfProductIds) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  console.log(ItemArray_OfProductIds);
  //Creates line item using productid
  console.log(ItemArray_OfProductIds, "here");
  //create a new deal

  //add each item from the pricesheet to the deal
  const CreateLineItem = async (ProductId) => {
    const requestData = [
      {
        name: "hs_product_id",
        value: ProductId,
      },
      {
        name: "quantity",
        value: "50",
      },
    ];
    //sends post request to generate the line item with product details
    // holds the object id that is returned for the put assocation

    const x = await request(
      "https://api.hubapi.com/crm-objects/v1/objects/line_items",
      {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: headers,
      }
    );
    y = JSON.parse(x);
    return y.objectId;
    console.log("line item created");
  };

  const CreateDeal = async () => {
    const requestData = {
      properties: {
        amount: "1500.00",
        dealname: "good1",
      },
    };

    const request_response = await request(
      "https://api.hubapi.com/crm/v3/objects/deals",
      {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: headers,
      }
    );
    response = JSON.parse(request_response);
    return response.id;
  };

  //uses objectID from lineitem post request to associate line item with deal
  const AssociateWithDeal = async (DealId, LineItemId) => {
    const assocdata = {
      fromObjectId: LineItemId,
      toObjectId: DealId,
      category: "HUBSPOT_DEFINED",
      definitionId: 20,
    };

    //sends put request with deal as tobojectid, and line item as fromobjectid
    fetch("https://api.hubapi.com/crm-associations/v1/associations", {
      method: "PUT",
      body: JSON.stringify(assocdata),
      headers: headers,
    }).then(console.log("association success"));
  };

  const DealId = await CreateDeal();
  for (let i = 0; i < ItemArray_OfProductIds.length; i++) {
    //passes product id, creates line item and returns lineitem ID
    const LineItemId = await CreateLineItem(ItemArray_OfProductIds[i]);
    console.log(DealId, LineItemId, "here");
    //associates line item with deal
    AssociateWithDeal(DealId, LineItemId);
  }
};

module.exports = {
  hello,
  getAllProductSKU,
  MatchSKUs_GetProductid,
  AddItems,
};
