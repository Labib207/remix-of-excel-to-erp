import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listOrders from "./tools/list-orders";
import listRequests from "./tools/list-requests";
import getRequest from "./tools/get-request";
import listRequirements from "./tools/list-requirements";
import searchItems from "./tools/search-items";
import addCatalogItem from "./tools/add-catalog-item";
import listDeliveryNotes from "./tools/list-delivery-notes";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ghoush-stock-management",
  title: "GHOUSH - Stock Management",
  version: "0.1.0",
  instructions:
    "Tools for GHOUSH stock management. Read production orders, trim chart requirements, material requests (with approval status and TR numbers), delivery notes, and the item master catalog. Always search the item catalog for the standardized description and item code before referencing an item; new items can be added with add_catalog_item.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listOrders,
    listRequests,
    getRequest,
    listRequirements,
    listDeliveryNotes,
    searchItems,
    addCatalogItem,
  ],
});
