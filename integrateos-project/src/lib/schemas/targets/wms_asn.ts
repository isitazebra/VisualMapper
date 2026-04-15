import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/**
 * Blue Yonder WMS Inbound ASN JSON target. Mirrors the nested shape a
 * modern warehouse API expects — 5 levels deep (shipment → orders →
 * pallets → cases → items) — so a mapping can showcase the loop-aware
 * transform engine end to end.
 *
 * Seg convention: JSON key paths with leading `.`. Loop nodes use
 * "[]" suffix. Groups wrap a sub-object.
 */
export const JSON_WMS_ASN_TARGET: SchemaNode[] = [
  // Top-level wrapper.
  N("wa", ".receivingAdvice", "receivingAdvice", 0, "group", {
    kids: [
      "wa_cd",
      "wa_sid",
      "wa_bol",
      "wa_st",
      "wa_carrier",
      "wa_dates",
      "wa_sf",
      "wa_st_loc",
      "wa_totals",
      "wa_orders",
    ],
  }),
  N("wa_cd", ".creationDate", "Creation date (ISO)", 1, "el"),
  N("wa_sid", ".shipmentId", "Shipment ID", 1, "el"),
  N("wa_bol", ".bolNumber", "BOL number", 1, "el"),
  N("wa_st", ".status", "Shipment status", 1, "el"),

  // carrier { scac, trailerNumber, transportMode, service }
  N("wa_carrier", ".carrier", "carrier", 1, "group", {
    kids: ["wa_c_scac", "wa_c_trail", "wa_c_mode", "wa_c_svc"],
  }),
  N("wa_c_scac", ".scac", "SCAC", 2, "el"),
  N("wa_c_trail", ".trailerNumber", "Trailer number", 2, "el"),
  N("wa_c_mode", ".transportMode", "Transport mode", 2, "el"),
  N("wa_c_svc", ".service", "Service label", 2, "el"),

  // dates { shipped, estimatedDelivery, receivedAt }
  N("wa_dates", ".dates", "dates", 1, "group", {
    kids: ["wa_d_ship", "wa_d_est", "wa_d_rcv"],
  }),
  N("wa_d_ship", ".shipped", "Shipped date (ISO)", 2, "el"),
  N("wa_d_est", ".estimatedDelivery", "Estimated delivery (ISO)", 2, "el"),
  N("wa_d_rcv", ".receivedAt", "Received at (UTC timestamp)", 2, "el"),

  // shipFrom { name, address, city, state, postalCode, countryCode3 }
  N("wa_sf", ".shipFrom", "shipFrom", 1, "group", {
    kids: ["wa_sf_name", "wa_sf_addr", "wa_sf_city", "wa_sf_state", "wa_sf_zip", "wa_sf_cc"],
  }),
  N("wa_sf_name", ".name", "Ship-from name", 2, "el"),
  N("wa_sf_addr", ".address", "Address", 2, "el"),
  N("wa_sf_city", ".city", "City", 2, "el"),
  N("wa_sf_state", ".state", "State", 2, "el"),
  N("wa_sf_zip", ".postalCode", "Postal code", 2, "el"),
  N("wa_sf_cc", ".countryCode3", "Country (3-letter ISO)", 2, "el"),

  // shipTo same shape
  N("wa_st_loc", ".shipTo", "shipTo", 1, "group", {
    kids: ["wa_st_name", "wa_st_wh", "wa_st_city", "wa_st_state", "wa_st_zip", "wa_st_cc"],
  }),
  N("wa_st_name", ".name", "Ship-to name", 2, "el"),
  N("wa_st_wh", ".warehouseId", "Warehouse id", 2, "el"),
  N("wa_st_city", ".city", "City", 2, "el"),
  N("wa_st_state", ".state", "State", 2, "el"),
  N("wa_st_zip", ".postalCode", "Postal code", 2, "el"),
  N("wa_st_cc", ".countryCode3", "Country (3-letter ISO)", 2, "el"),

  // totals (rollups from aggregate rules)
  N("wa_totals", ".totals", "totals", 1, "group", {
    kids: ["wa_tp", "wa_tc", "wa_ti", "wa_tw", "wa_twuom", "wa_torders"],
  }),
  N("wa_tp", ".totalPallets", "Total pallets", 2, "el"),
  N("wa_tc", ".totalCases", "Total cases", 2, "el"),
  N("wa_ti", ".totalItems", "Total item units", 2, "el"),
  N("wa_tw", ".totalWeight", "Total gross weight", 2, "el"),
  N("wa_twuom", ".weightUom", "Weight UOM", 2, "el"),
  N("wa_torders", ".orderCount", "Order count", 2, "el"),

  // orders[] — one per HL*O source iteration
  N("wa_orders", ".orders[]", "orders", 1, "loop", {
    max: "999",
    kids: ["wa_o_po", "wa_o_pod", "wa_o_line", "wa_o_pallets"],
  }),
  N("wa_o_po", ".poNumber", "PO #", 2, "el"),
  N("wa_o_pod", ".poDate", "PO date (ISO)", 2, "el"),
  N("wa_o_line", ".orderLineNumber", "Order line # (auto)", 2, "el"),

  // pallets[] — nested under orders[]
  N("wa_o_pallets", ".pallets[]", "pallets", 2, "loop", {
    max: "9999",
    kids: ["wa_p_id", "wa_p_cases", "wa_p_wt", "wa_p_cont"],
  }),
  N("wa_p_id", ".palletSscc18", "Pallet SSCC-18", 3, "el"),
  N("wa_p_cases", ".casesPerPallet", "Cases per pallet", 3, "el"),
  N("wa_p_wt", ".palletWeightKg", "Pallet weight (kg)", 3, "el"),
  N("wa_p_cont", ".containers[]", "containers", 3, "loop", {
    max: "9999",
    kids: ["wa_p_c_id", "wa_p_c_qty", "wa_p_c_items"],
  }),
  N("wa_p_c_id", ".caseSscc18", "Case SSCC-18", 4, "el"),
  N("wa_p_c_qty", ".caseQty", "Case qty", 4, "el"),
  N("wa_p_c_items", ".items[]", "items", 4, "loop", {
    max: "9999",
    kids: [
      "wa_i_upc",
      "wa_i_gtin",
      "wa_i_sku",
      "wa_i_desc",
      "wa_i_qty",
      "wa_i_uom",
      "wa_i_wt",
      "wa_i_lot",
      "wa_i_exp",
    ],
  }),
  N("wa_i_upc", ".upc", "UPC-12", 5, "el"),
  N("wa_i_gtin", ".gtin", "GTIN-14", 5, "el"),
  N("wa_i_sku", ".buyerSku", "Buyer SKU", 5, "el"),
  N("wa_i_desc", ".description", "Description", 5, "el"),
  N("wa_i_qty", ".qty", "Qty", 5, "el"),
  N("wa_i_uom", ".uom", "UOM", 5, "el"),
  N("wa_i_wt", ".catchWeightKg", "Catch weight (kg)", 5, "el"),
  N("wa_i_lot", ".lotNumber", "Lot #", 5, "el"),
  N("wa_i_exp", ".expiryDate", "Expiry date (ISO)", 5, "el"),
];
