# HubspotOauth

todo: auto deal name creation for the association
other data for line items aside from SKU

PASSING DATA:

use cookies to store data,
then when submit is hit, first clear all cookies incase the user premptively closed the browser in the past and the cookies may overlap
other data:
-sometimes things arent in the product library

Line Item
-unit price -> unit price cad
unit cost -> our cost cad
type -> menu option

Deal
name, type, stage, owner, closedate,
!!When creating deal, use the user dropdown information when deciding on hubspot owner id

BACKEND:

goes to oauthtrigg path, assigns data within url to SKUaccept

if not authorized sends to install reroute, once there gets you to authorize

handles token that is sent from hubspot to our pre set oauthcallback url, where we obtain auth token and exchange for refresh/access toekn

sends user back to oauthtrigg and begins workflow now that authorized

(post oauth workflow)

get access token

call hubspot api to get all the SKU's from the hubspot product page and return results

Now pass our array of SKU's from the pricesheet, and the productpage of the SKU's.
Compare our SKU from pricesheet to SKU'S in product page found earlier.
This done because in order to create a line item with our product & associate the line item with a deal, we need to get the product ID via the SKU
Once we find the matching SKU's, we get the product ID, repeat and return all the product ID's

Now we have all productID's of the items we want in our deal.
Pass access token and array of productID's of the items we want to add.
AddItems then creates a deal, creates line item for each product and associate each lineitem with the newly created deal
