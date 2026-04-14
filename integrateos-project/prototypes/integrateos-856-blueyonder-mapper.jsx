import { useState, useReducer, useCallback, useRef } from "react";
// SheetJS loaded dynamically in download function

const C = {
  bg: "#f3f1ec", paper: "#faf8f4", white: "#fff", cream: "#edeae3",
  border: "#dbd6cb", bHard: "#c2bdb0", focus: "#1d4ed8",
  tx: "#1b1914", t2: "#5a554b", t3: "#999189",
  bl: "#1d4ed8", blS: "#eef2ff",
  gn: "#15803d", gnS: "#f0fdf4", gnB: "#86efac",
  am: "#a16207", amS: "#fefce8",
  rd: "#be123c", rdS: "#fff1f2",
  pu: "#7c3aed", puS: "#f5f3ff",
  tl: "#0f766e", tlS: "#f0fdf9",
  or: "#c2410c", orS: "#fff7ed",
  pk: "#be185d", pkS: "#fdf2f8",
  font: "'Karla', sans-serif",
  mono: "'Fira Code', monospace",
};

// ── HL LEVEL COLORS ──
const HL = {
  S: { label: "Shipment", color: "#1d4ed8", bg: "#eef2ff", tag: "HL-S" },
  O: { label: "Order", color: "#7c3aed", bg: "#f5f3ff", tag: "HL-O" },
  T: { label: "Tare/Pallet", color: "#c2410c", bg: "#fff7ed", tag: "HL-T" },
  P: { label: "Pack/Case", color: "#be185d", bg: "#fdf2f8", tag: "HL-P" },
  I: { label: "Item", color: "#15803d", bg: "#f0fdf4", tag: "HL-I" },
};

const BY_COLORS = {
  header: { color: "#0369a1", bg: "#f0f9ff" },
  shipDetail: { color: "#7c3aed", bg: "#f5f3ff" },
  container: { color: "#c2410c", bg: "#fff7ed" },
  lineItem: { color: "#15803d", bg: "#f0fdf4" },
  lpn: { color: "#be185d", bg: "#fdf2f8" },
  catchWt: { color: "#a16207", bg: "#fefce8" },
};

// ── SOURCE: X12 856 ASN ──
const SRC = [
  // BSN
  { id: "bsn", seg: "BSN", label: "Beginning Segment for Ship Notice", d: 0, type: "group", hl: null, kids: ["bsn01","bsn02","bsn03","bsn04","bsn05"] },
  { id: "bsn01", seg: "BSN01", label: "Purpose Code", d: 1, type: "el", sample: "00", note: "00=Original, 03=Delete", hl: null },
  { id: "bsn02", seg: "BSN02", label: "Shipment Identification", d: 1, type: "el", sample: "SHP-2024-99841", hl: null },
  { id: "bsn03", seg: "BSN03", label: "Shipment Date", d: 1, type: "el", sample: "20240318", hl: null },
  { id: "bsn04", seg: "BSN04", label: "Shipment Time", d: 1, type: "el", sample: "1430", hl: null },
  { id: "bsn05", seg: "BSN05", label: "Hierarchical Structure Code", d: 1, type: "el", sample: "0001", note: "0001=Shipment/Order/Tare/Pack/Item", hl: null },

  // HL-S Shipment
  { id: "hls", seg: "HL (S)", label: "Shipment Level", d: 0, type: "loop", hl: "S", max: "1", kids: ["td1","td101","td102","td5","td501","td502","td503","td504","td3","td301","td302","ref_s","refs_bol","refs_pro","dtm_s","dtms_ship","dtms_dlv","dtms_exp","n1s_loop","n1s_sf","n1s_sf_n3","n1s_sf_n4ci","n1s_sf_n4st","n1s_sf_n4zi","n1s_st","n1s_st_n102","n1s_st_n104","n1s_st_n3","n1s_st_n4ci","n1s_st_n4st","n1s_st_n4zi"] },

  { id: "td1", seg: "TD1", label: "Carrier Details (Quantity & Weight)", d: 1, type: "group", hl: "S", kids: ["td101","td102"] },
  { id: "td101", seg: "TD1*01", label: "Packaging Code", d: 2, type: "el", sample: "PLT94", note: "PLT94=Standard Pallet", hl: "S" },
  { id: "td102", seg: "TD1*02", label: "Lading Quantity (# Pallets)", d: 2, type: "el", sample: "12", hl: "S" },

  { id: "td5", seg: "TD5", label: "Carrier Details (Routing)", d: 1, type: "group", hl: "S", kids: ["td501","td502","td503","td504"] },
  { id: "td501", seg: "TD5*01", label: "Routing Sequence Code", d: 2, type: "el", sample: "B", note: "B=Origin Carrier", hl: "S" },
  { id: "td502", seg: "TD5*02", label: "ID Code Qualifier (SCAC)", d: 2, type: "el", sample: "2", note: "2=SCAC", hl: "S" },
  { id: "td503", seg: "TD5*03", label: "Carrier SCAC", d: 2, type: "el", sample: "ODFL", hl: "S" },
  { id: "td504", seg: "TD5*04", label: "Transportation Method", d: 2, type: "el", sample: "M", note: "M=Motor, R=Rail, A=Air", hl: "S" },

  { id: "td3", seg: "TD3", label: "Carrier Details (Equipment)", d: 1, type: "group", hl: "S", kids: ["td301","td302"] },
  { id: "td301", seg: "TD3*01", label: "Equipment Type", d: 2, type: "el", sample: "TL", note: "TL=Trailer", hl: "S" },
  { id: "td302", seg: "TD3*03", label: "Equipment Number (Trailer#)", d: 2, type: "el", sample: "ODFL-44872", hl: "S" },

  { id: "ref_s", seg: "REF (S)", label: "Shipment References", d: 1, type: "group", hl: "S", kids: ["refs_bol","refs_pro"] },
  { id: "refs_bol", seg: "REF*BM", label: "Bill of Lading Number", d: 2, type: "el", sample: "BOL-887421", hl: "S" },
  { id: "refs_pro", seg: "REF*CN", label: "PRO Number / Carrier Ref", d: 2, type: "el", sample: "PRO-553219", hl: "S" },

  { id: "dtm_s", seg: "DTM (S)", label: "Shipment Dates", d: 1, type: "group", hl: "S", kids: ["dtms_ship","dtms_dlv","dtms_exp"] },
  { id: "dtms_ship", seg: "DTM*011", label: "Shipped Date", d: 2, type: "el", sample: "20240318", hl: "S" },
  { id: "dtms_dlv", seg: "DTM*017", label: "Estimated Delivery Date", d: 2, type: "el", sample: "20240320", hl: "S" },
  { id: "dtms_exp", seg: "DTM*036", label: "Expiration Date", d: 2, type: "el", sample: "20241215", note: "For perishables", hl: "S" },

  // N1 Loops under Shipment
  { id: "n1s_loop", seg: "N1 Loop (S)", label: "Parties", d: 1, type: "loop", hl: "S", max: "5", kids: ["n1s_sf","n1s_sf_n3","n1s_sf_n4ci","n1s_sf_n4st","n1s_sf_n4zi","n1s_st","n1s_st_n102","n1s_st_n104","n1s_st_n3","n1s_st_n4ci","n1s_st_n4st","n1s_st_n4zi"] },
  { id: "n1s_sf", seg: "N1*SF", label: "Ship From — Name", d: 2, type: "el", sample: "AIT Dallas DC", hl: "S" },
  { id: "n1s_sf_n3", seg: "N3 (SF)", label: "Ship From — Street", d: 2, type: "el", sample: "1200 Commerce Dr", hl: "S" },
  { id: "n1s_sf_n4ci", seg: "N4*CI (SF)", label: "Ship From — City", d: 2, type: "el", sample: "Dallas", hl: "S" },
  { id: "n1s_sf_n4st", seg: "N4*ST (SF)", label: "Ship From — State", d: 2, type: "el", sample: "TX", hl: "S" },
  { id: "n1s_sf_n4zi", seg: "N4*ZI (SF)", label: "Ship From — Zip", d: 2, type: "el", sample: "75201", hl: "S" },
  { id: "n1s_st", seg: "N1*ST", label: "Ship To — Name", d: 2, type: "el", sample: "Kroger DC #847", hl: "S" },
  { id: "n1s_st_n102", seg: "N1*ST*02", label: "Ship To — ID Qualifier", d: 2, type: "el", sample: "UL", note: "UL=GLN", hl: "S" },
  { id: "n1s_st_n104", seg: "N1*ST*04", label: "Ship To — GLN", d: 2, type: "el", sample: "0078742000847", hl: "S" },
  { id: "n1s_st_n3", seg: "N3 (ST)", label: "Ship To — Street", d: 2, type: "el", sample: "800 Distribution Pkwy", hl: "S" },
  { id: "n1s_st_n4ci", seg: "N4*CI (ST)", label: "Ship To — City", d: 2, type: "el", sample: "Nashville", hl: "S" },
  { id: "n1s_st_n4st", seg: "N4*ST (ST)", label: "Ship To — State", d: 2, type: "el", sample: "TN", hl: "S" },
  { id: "n1s_st_n4zi", seg: "N4*ZI (ST)", label: "Ship To — Zip", d: 2, type: "el", sample: "37201", hl: "S" },

  // HL-O Order
  { id: "hlo", seg: "HL (O)", label: "Order Level", d: 0, type: "loop", hl: "O", max: "999", nested: true, parent: "hls", kids: ["prf01","prf02","prf04","refo_dept","refo_div"] },
  { id: "prf01", seg: "PRF*01", label: "PO Number", d: 1, type: "el", sample: "PO-2024-88712", hl: "O" },
  { id: "prf02", seg: "PRF*02", label: "Release Number", d: 1, type: "el", sample: "REL-001", note: "For blanket POs", hl: "O" },
  { id: "prf04", seg: "PRF*04", label: "PO Date", d: 1, type: "el", sample: "20240310", hl: "O" },
  { id: "refo_dept", seg: "REF*DP", label: "Department Number", d: 1, type: "el", sample: "DEPT-044", hl: "O" },
  { id: "refo_div", seg: "REF*DI", label: "Division Code", d: 1, type: "el", sample: "GROCERY", hl: "O" },

  // HL-T Tare (Pallet)
  { id: "hlt", seg: "HL (T)", label: "Tare / Pallet Level", d: 0, type: "loop", hl: "T", max: "9999", nested: true, parent: "hlo", kids: ["man_t_gm","man_t_sscc","po4_t","po4t_pack","po4t_wt","po4t_uom","reft_plt"] },
  { id: "man_t_gm", seg: "MAN*GM", label: "Marks & Numbers Qualifier", d: 1, type: "el", sample: "GM", note: "GM=SSCC-18", hl: "T" },
  { id: "man_t_sscc", seg: "MAN*GM*02", label: "SSCC-18 (Pallet)", d: 1, type: "el", sample: "00300712345600001234", hl: "T" },
  { id: "po4_t", seg: "PO4 (T)", label: "Pallet Item Physical Details", d: 1, type: "group", hl: "T", kids: ["po4t_pack","po4t_wt","po4t_uom"] },
  { id: "po4t_pack", seg: "PO4*01", label: "Cases per Pallet", d: 2, type: "el", sample: "48", hl: "T" },
  { id: "po4t_wt", seg: "PO4*08", label: "Gross Weight (Pallet)", d: 2, type: "el", sample: "1842.5", hl: "T" },
  { id: "po4t_uom", seg: "PO4*09", label: "Weight UOM", d: 2, type: "el", sample: "LB", hl: "T" },
  { id: "reft_plt", seg: "REF*LS", label: "Pallet Lot/Serial", d: 1, type: "el", sample: "LOT-2024-A117", hl: "T" },

  // HL-P Pack (Case)
  { id: "hlp", seg: "HL (P)", label: "Pack / Case Level", d: 0, type: "loop", hl: "P", max: "9999", nested: true, parent: "hlt", kids: ["man_p_gm","man_p_sscc","po4p_ea","po4p_size","sn1p_qty","sn1p_uom"] },
  { id: "man_p_gm", seg: "MAN*GM (P)", label: "Marks Qualifier (Case)", d: 1, type: "el", sample: "GM", hl: "P" },
  { id: "man_p_sscc", seg: "MAN*GM*02 (P)", label: "SSCC-18 (Case)", d: 1, type: "el", sample: "00300712345600005678", hl: "P" },
  { id: "po4p_ea", seg: "PO4*01 (P)", label: "Each per Inner Pack", d: 1, type: "el", sample: "6", hl: "P" },
  { id: "po4p_size", seg: "PO4*04 (P)", label: "Inner Pack Size", d: 1, type: "el", sample: "24oz", hl: "P" },
  { id: "sn1p_qty", seg: "SN1*02 (P)", label: "Quantity Shipped (Case)", d: 1, type: "el", sample: "48", hl: "P" },
  { id: "sn1p_uom", seg: "SN1*03 (P)", label: "UOM (Case)", d: 1, type: "el", sample: "CA", note: "CA=Case, EA=Each", hl: "P" },

  // HL-I Item
  { id: "hli", seg: "HL (I)", label: "Item Level", d: 0, type: "loop", hl: "I", max: "9999", nested: true, parent: "hlp", kids: ["lin_upc","lin_gtin","lin_sku","lin_vpn","sn1_qty","sn1_uom","sn1_qtyord","pid_desc","mea_wt","mea_vol","mea_len","refi_lot","refi_exp","refi_ser"] },
  { id: "lin_upc", seg: "LIN*UP", label: "UPC-12", d: 1, type: "el", sample: "012345678905", hl: "I" },
  { id: "lin_gtin", seg: "LIN*EN", label: "GTIN-14 (EAN)", d: 1, type: "el", sample: "10012345678902", hl: "I" },
  { id: "lin_sku", seg: "LIN*IN", label: "Buyer Item Number (SKU)", d: 1, type: "el", sample: "KRG-44521", hl: "I" },
  { id: "lin_vpn", seg: "LIN*VN", label: "Vendor Part Number", d: 1, type: "el", sample: "AIT-BRD-WW24", hl: "I" },
  { id: "sn1_qty", seg: "SN1*02", label: "Quantity Shipped", d: 1, type: "el", sample: "576", hl: "I" },
  { id: "sn1_uom", seg: "SN1*03", label: "Unit of Measure", d: 1, type: "el", sample: "EA", hl: "I" },
  { id: "sn1_qtyord", seg: "SN1*05", label: "Quantity Ordered", d: 1, type: "el", sample: "600", hl: "I" },
  { id: "pid_desc", seg: "PID*F*08", label: "Product Description", d: 1, type: "el", sample: "Organic Whole Wheat Bread 24oz", hl: "I" },
  { id: "mea_wt", seg: "MEA*PD*WT", label: "Actual Weight (Item)", d: 1, type: "el", sample: "1.65", note: "Catch weight per EA", hl: "I" },
  { id: "mea_vol", seg: "MEA*PD*VOL", label: "Volume", d: 1, type: "el", sample: "0.042", hl: "I" },
  { id: "mea_len", seg: "MEA*PD*LN", label: "Length", d: 1, type: "el", sample: "12.5", hl: "I" },
  { id: "refi_lot", seg: "REF*LT", label: "Lot Number", d: 1, type: "el", sample: "LOT-2024-A117", hl: "I" },
  { id: "refi_exp", seg: "REF*EXP", label: "Expiration Date", d: 1, type: "el", sample: "20241215", hl: "I" },
  { id: "refi_ser", seg: "REF*SE", label: "Serial Number", d: 1, type: "el", sample: "SER-00884521", note: "Serialized items only", hl: "I" },

  // Totals
  { id: "ctt", seg: "CTT", label: "Transaction Totals", d: 0, type: "group", hl: null, kids: ["ctt01","ctt02"] },
  { id: "ctt01", seg: "CTT*01", label: "Total Line Items", d: 1, type: "el", sample: "42", hl: null },
  { id: "ctt02", seg: "CTT*02", label: "Hash Total", d: 1, type: "el", sample: "27648", hl: null },
];

// ── TARGET: Blue Yonder WMS Inbound ASN ──
const TGT = [
  { id: "by_hdr", seg: "ASN_HEADER", label: "ASN Header Record", d: 0, type: "group", bySection: "header", kids: ["by_h_fac","by_h_shpid","by_h_type","by_h_status","by_h_carrier","by_h_scac","by_h_mode","by_h_bol","by_h_pro","by_h_trailer","by_h_shipdt","by_h_eta","by_h_totplt","by_h_totwt","by_h_sf_name","by_h_sf_addr","by_h_sf_city","by_h_sf_state","by_h_sf_zip","by_h_st_name","by_h_st_gln","by_h_st_addr","by_h_st_city","by_h_st_state","by_h_st_zip"] },
  { id: "by_h_fac", seg: "FACILITY_CODE", label: "BY Facility Code", d: 1, type: "el", note: "Derive from Ship-To GLN lookup", bySection: "header" },
  { id: "by_h_shpid", seg: "SHIPMENT_ID", label: "Shipment Number", d: 1, type: "el", bySection: "header" },
  { id: "by_h_type", seg: "ASN_TYPE", label: "ASN Type", d: 1, type: "el", note: "NEW, REPLACE, CANCEL", bySection: "header" },
  { id: "by_h_status", seg: "STATUS_CODE", label: "Shipment Status", d: 1, type: "el", note: "10=Planned, 20=In Transit, 30=Arrived", bySection: "header" },
  { id: "by_h_carrier", seg: "CARRIER_NAME", label: "Carrier Name", d: 1, type: "el", note: "Lookup from SCAC", bySection: "header" },
  { id: "by_h_scac", seg: "CARRIER_SCAC", label: "Carrier SCAC Code", d: 1, type: "el", bySection: "header" },
  { id: "by_h_mode", seg: "TRANSPORT_MODE", label: "Transportation Mode", d: 1, type: "el", note: "TL, LTL, PARCEL, RAIL, AIR", bySection: "header" },
  { id: "by_h_bol", seg: "BOL_NUMBER", label: "Bill of Lading", d: 1, type: "el", bySection: "header" },
  { id: "by_h_pro", seg: "PRO_NUMBER", label: "Carrier PRO Number", d: 1, type: "el", bySection: "header" },
  { id: "by_h_trailer", seg: "TRAILER_NUMBER", label: "Trailer/Equipment Number", d: 1, type: "el", bySection: "header" },
  { id: "by_h_shipdt", seg: "SHIP_DATE", label: "Ship Date (YYYY-MM-DD)", d: 1, type: "el", note: "ISO format required", bySection: "header" },
  { id: "by_h_eta", seg: "EXPECTED_DATE", label: "Expected Arrival Date", d: 1, type: "el", note: "ISO format required", bySection: "header" },
  { id: "by_h_totplt", seg: "TOTAL_PALLETS", label: "Total Pallet Count", d: 1, type: "el", bySection: "header" },
  { id: "by_h_totwt", seg: "TOTAL_WEIGHT", label: "Total Shipment Weight", d: 1, type: "el", bySection: "header" },
  { id: "by_h_sf_name", seg: "SHIP_FROM_NAME", label: "Ship From — Vendor Name", d: 1, type: "el", bySection: "header" },
  { id: "by_h_sf_addr", seg: "SHIP_FROM_ADDR", label: "Ship From — Address", d: 1, type: "el", bySection: "header" },
  { id: "by_h_sf_city", seg: "SHIP_FROM_CITY", label: "Ship From — City", d: 1, type: "el", bySection: "header" },
  { id: "by_h_sf_state", seg: "SHIP_FROM_STATE", label: "Ship From — State", d: 1, type: "el", bySection: "header" },
  { id: "by_h_sf_zip", seg: "SHIP_FROM_ZIP", label: "Ship From — Zip", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_name", seg: "SHIP_TO_NAME", label: "Ship To — DC Name", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_gln", seg: "SHIP_TO_GLN", label: "Ship To — GLN", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_addr", seg: "SHIP_TO_ADDR", label: "Ship To — Address", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_city", seg: "SHIP_TO_CITY", label: "Ship To — City", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_state", seg: "SHIP_TO_STATE", label: "Ship To — State", d: 1, type: "el", bySection: "header" },
  { id: "by_h_st_zip", seg: "SHIP_TO_ZIP", label: "Ship To — Zip", d: 1, type: "el", bySection: "header" },

  { id: "by_ord", seg: "ASN_ORDER_DETAIL", label: "Order Detail (per PO)", d: 0, type: "loop", max: "N", bySection: "shipDetail", kids: ["by_o_po","by_o_rel","by_o_podt","by_o_dept","by_o_div"] },
  { id: "by_o_po", seg: "PO_NUMBER", label: "Purchase Order Number", d: 1, type: "el", bySection: "shipDetail" },
  { id: "by_o_rel", seg: "RELEASE_NUMBER", label: "PO Release Number", d: 1, type: "el", bySection: "shipDetail" },
  { id: "by_o_podt", seg: "PO_DATE", label: "PO Date", d: 1, type: "el", bySection: "shipDetail" },
  { id: "by_o_dept", seg: "DEPARTMENT", label: "Department Code", d: 1, type: "el", bySection: "shipDetail" },
  { id: "by_o_div", seg: "DIVISION", label: "Division", d: 1, type: "el", bySection: "shipDetail" },

  { id: "by_pallet", seg: "ASN_CONTAINER_PALLET", label: "Pallet / Tare Container", d: 0, type: "loop", max: "N", bySection: "container", kids: ["by_p_sscc","by_p_type","by_p_cases","by_p_wt","by_p_wtuom","by_p_lot","by_p_poref"] },
  { id: "by_p_sscc", seg: "PALLET_SSCC", label: "Pallet SSCC-18", d: 1, type: "el", note: "18-digit with check digit", bySection: "container" },
  { id: "by_p_type", seg: "CONTAINER_TYPE", label: "Container Type", d: 1, type: "el", note: "PLT=Pallet, SLIP=Slip Sheet", bySection: "container" },
  { id: "by_p_cases", seg: "CASES_ON_PALLET", label: "Number of Cases", d: 1, type: "el", bySection: "container" },
  { id: "by_p_wt", seg: "PALLET_WEIGHT", label: "Gross Weight", d: 1, type: "el", bySection: "container" },
  { id: "by_p_wtuom", seg: "WEIGHT_UOM", label: "Weight UOM", d: 1, type: "el", note: "LB or KG", bySection: "container" },
  { id: "by_p_lot", seg: "PALLET_LOT", label: "Pallet Lot Reference", d: 1, type: "el", bySection: "container" },
  { id: "by_p_poref", seg: "PALLET_PO_REF", label: "PO Reference (if single-PO pallet)", d: 1, type: "el", bySection: "container" },

  { id: "by_case", seg: "ASN_CONTAINER_CASE", label: "Case Container (nested under pallet)", d: 0, type: "loop", max: "N", nested: true, bySection: "container", kids: ["by_c_sscc","by_c_parent","by_c_type","by_c_eaPerCase","by_c_qty","by_c_uom"] },
  { id: "by_c_sscc", seg: "CASE_SSCC", label: "Case SSCC-18", d: 1, type: "el", bySection: "container" },
  { id: "by_c_parent", seg: "PARENT_SSCC", label: "Parent Pallet SSCC", d: 1, type: "el", note: "Links case to pallet", bySection: "container" },
  { id: "by_c_type", seg: "CASE_TYPE", label: "Case Pack Type", d: 1, type: "el", note: "CS=Case, IP=Inner Pack", bySection: "container" },
  { id: "by_c_eaPerCase", seg: "EACH_PER_CASE", label: "Eaches per Case", d: 1, type: "el", bySection: "container" },
  { id: "by_c_qty", seg: "CASE_QTY", label: "Case Quantity Shipped", d: 1, type: "el", bySection: "container" },
  { id: "by_c_uom", seg: "CASE_UOM", label: "Unit of Measure", d: 1, type: "el", bySection: "container" },

  { id: "by_item", seg: "ASN_LINE_ITEM", label: "Line Item Detail", d: 0, type: "loop", max: "N", bySection: "lineItem", kids: ["by_i_upc","by_i_gtin","by_i_sku","by_i_vpn","by_i_desc","by_i_qty","by_i_uom","by_i_qtyord","by_i_poref","by_i_lot","by_i_exp","by_i_serial","by_i_sscc"] },
  { id: "by_i_upc", seg: "ITEM_UPC", label: "UPC-12", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_gtin", seg: "ITEM_GTIN", label: "GTIN-14", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_sku", seg: "BUYER_SKU", label: "Buyer Item Number", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_vpn", seg: "VENDOR_PART", label: "Vendor Part Number", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_desc", seg: "ITEM_DESC", label: "Product Description", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_qty", seg: "QTY_SHIPPED", label: "Quantity Shipped", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_uom", seg: "ITEM_UOM", label: "Unit of Measure", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_qtyord", seg: "QTY_ORDERED", label: "Quantity Ordered (reference)", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_poref", seg: "LINE_PO_REF", label: "PO Number (line level)", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_lot", seg: "LOT_NUMBER", label: "Lot / Batch Number", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_exp", seg: "EXPIRY_DATE", label: "Expiration Date (YYYY-MM-DD)", d: 1, type: "el", note: "ISO format", bySection: "lineItem" },
  { id: "by_i_serial", seg: "SERIAL_NUMBER", label: "Serial Number", d: 1, type: "el", bySection: "lineItem" },
  { id: "by_i_sscc", seg: "CONTAINER_SSCC", label: "Parent Container SSCC", d: 1, type: "el", note: "Links item to case/pallet", bySection: "lineItem" },

  { id: "by_cw", seg: "ASN_CATCH_WEIGHT", label: "Catch Weight Record", d: 0, type: "loop", max: "N", bySection: "catchWt", kids: ["by_cw_upc","by_cw_wt","by_cw_uom","by_cw_vol","by_cw_len"] },
  { id: "by_cw_upc", seg: "CW_ITEM_UPC", label: "Item Identifier", d: 1, type: "el", bySection: "catchWt" },
  { id: "by_cw_wt", seg: "ACTUAL_WEIGHT", label: "Actual Weight per EA", d: 1, type: "el", note: "Variable weight items", bySection: "catchWt" },
  { id: "by_cw_uom", seg: "CW_WEIGHT_UOM", label: "Weight UOM", d: 1, type: "el", bySection: "catchWt" },
  { id: "by_cw_vol", seg: "ACTUAL_VOLUME", label: "Actual Volume", d: 1, type: "el", bySection: "catchWt" },
  { id: "by_cw_len", seg: "ACTUAL_LENGTH", label: "Actual Length", d: 1, type: "el", bySection: "catchWt" },
];

// ── STATE ──
const init = { maps: [], collapsed: {}, selSrc: null, rules: [], ruleIn: "", loopOps: {} };

function red(s, a) {
  switch (a.type) {
    case "TOG": return { ...s, collapsed: { ...s.collapsed, [a.id]: !s.collapsed[a.id] } };
    case "SEL": return { ...s, selSrc: s.selSrc === a.id ? null : a.id };
    case "MAP": {
      if (!s.selSrc) return s;
      if (s.maps.find(m => m.tid === a.tid)) return s;
      return { ...s, maps: [...s.maps, { id: `m${Date.now()}`, sid: s.selSrc, tid: a.tid, rule: "", ok: false }], selSrc: null };
    }
    case "DEL": return { ...s, maps: s.maps.filter(m => m.id !== a.id) };
    case "RULE": return { ...s, maps: s.maps.map(m => m.id === a.id ? { ...m, rule: a.r } : m) };
    case "OK": return { ...s, maps: s.maps.map(m => m.id === a.id ? { ...m, ok: !m.ok } : m) };
    case "LOP": return { ...s, loopOps: { ...s.loopOps, [a.lid]: { op: a.op, cond: a.cond || "" } } };
    case "ARULE": return { ...s, rules: [...s.rules, { id: `r${Date.now()}`, text: a.text, rt: a.rt, on: true }] };
    case "DRULE": return { ...s, rules: s.rules.filter(r => r.id !== a.id) };
    case "RI": return { ...s, ruleIn: a.v };
    case "AUTO": {
      const nm = []; const used = new Set(s.maps.map(m => m.tid));
      const se = SRC.filter(n => n.type === "el"); const te = TGT.filter(n => n.type === "el");
      se.forEach(sf => {
        const sw = sf.label.toLowerCase().split(/[\s_\/\-()]+/).filter(w => w.length > 2);
        let best = null, bs = 0;
        te.forEach(tf => {
          if (used.has(tf.id)) return;
          const tw = tf.label.toLowerCase().split(/[\s_\/\-()]+/).filter(w => w.length > 2);
          let h = 0; sw.forEach(w => { if (tw.some(t => t.includes(w) || w.includes(t))) h++; });
          const sc = h / Math.max(sw.length, tw.length, 1);
          if (sc > bs && sc >= 0.3) { best = tf; bs = sc; }
        });
        if (best) { used.add(best.id); nm.push({ id: `m${Date.now()}_${sf.id}`, sid: sf.id, tid: best.id, rule: "", ok: false }); }
      });
      return { ...s, maps: [...s.maps, ...nm] };
    }
    default: return s;
  }
}

// ── ROW COMPONENT ──
function Row({ n, side, tree, s, d }) {
  const [ed, setEd] = useState(false);
  const [rt, setRt] = useState("");
  const [fc, setFc] = useState("");
  const isEl = n.type === "el";
  const isLoop = n.type === "loop";
  const isGrp = n.type === "group";
  const m = isEl ? s.maps.find(x => side === "s" ? x.sid === n.id : x.tid === n.id) : null;
  const isMapped = !!m;
  const isSel = side === "s" && s.selSrc === n.id;
  const hlC = n.hl ? HL[n.hl] : null;
  const byC = n.bySection ? BY_COLORS[n.bySection] : null;
  const sectionColor = side === "s" ? hlC : byC;
  const lop = s.loopOps[n.id];
  const indent = n.d * 22;

  const bars = [];
  for (let i = 1; i <= n.d; i++) {
    const bc = side === "s"
      ? [C.bl, C.pu, C.or, C.pk, C.gn][Math.min(i - 1, 4)]
      : [BY_COLORS.header.color, BY_COLORS.shipDetail.color, BY_COLORS.container.color, BY_COLORS.lineItem.color][Math.min(i - 1, 3)];
    bars.push(<div key={i} style={{ position: "absolute", left: i * 22 - 11, top: 0, bottom: 0, width: 1, background: bc + "25" }} />);
  }

  const partnerNode = m ? (side === "s" ? TGT.find(t => t.id === m.tid) : SRC.find(t => t.id === m.sid)) : null;

  return (
    <div>
      <div
        onClick={() => {
          if (n.kids?.length && !isEl) d({ type: "TOG", id: n.id });
          else if (isEl && side === "s") d({ type: "SEL", id: n.id });
          else if (isEl && side === "t" && s.selSrc) d({ type: "MAP", tid: n.id });
        }}
        style={{
          display: "grid",
          gridTemplateColumns: side === "s" ? "minmax(180px,2fr) 1.3fr 0.8fr" : "minmax(180px,2fr) 1.3fr",
          borderBottom: `1px solid ${isLoop ? C.bHard : C.border}`,
          background: isSel ? C.blS : isMapped ? (m?.ok ? C.gnS : "#fdfcf5") : isLoop ? (sectionColor?.bg || C.cream) : C.paper,
          cursor: isEl ? "pointer" : "default", position: "relative",
        }}
      >
        {bars}
        {/* Seg */}
        <div style={{ padding: "6px 6px 6px " + (indent + 6) + "px", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          {n.kids?.length && !isEl ? (
            <span onClick={e => { e.stopPropagation(); d({ type: "TOG", id: n.id }); }} style={{ cursor: "pointer", fontSize: 9, color: C.t3, width: 12, textAlign: "center", flexShrink: 0 }}>
              {s.collapsed[n.id] ? "▶" : "▼"}
            </span>
          ) : isEl ? (
            <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, border: `2px solid ${isMapped ? (m?.ok ? C.gn : C.bl) : isSel ? C.bl : C.border}`, background: isMapped ? (m?.ok ? C.gn : C.bl) : "transparent" }} />
          ) : <span style={{ width: 12 }} />}

          {isLoop && (
            <span style={{ fontSize: 8, fontWeight: 800, padding: "0 4px", borderRadius: 2, background: sectionColor?.bg || C.amS, color: sectionColor?.color || C.am, border: `1px solid ${(sectionColor?.color || C.am) + "22"}`, fontFamily: C.mono, flexShrink: 0, lineHeight: "16px" }}>
              {side === "s" ? (hlC?.tag || "LOOP") : "ARRAY"}{n.max ? ` ≤${n.max}` : ""}{n.nested ? " ↳" : ""}
            </span>
          )}
          {isGrp && <span style={{ fontSize: 8, fontWeight: 800, padding: "0 4px", borderRadius: 2, background: C.blS, color: C.bl, fontFamily: C.mono, flexShrink: 0, lineHeight: "16px" }}>GRP</span>}

          <span style={{ fontSize: 10.5, fontFamily: C.mono, fontWeight: 600, color: sectionColor?.color || C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.seg}</span>
        </div>

        {/* Label */}
        <div style={{ padding: "6px 6px", borderRight: side === "s" ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: C.tx, fontWeight: isLoop || isGrp ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
          {n.note && <span style={{ fontSize: 8, color: C.t3, flexShrink: 0 }} title={n.note}>ⓘ</span>}
        </div>

        {/* Sample (source only) */}
        {side === "s" && (
          <div style={{ padding: "6px 6px", overflow: "hidden" }}>
            {isEl && <span style={{ fontSize: 10, fontFamily: C.mono, color: C.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{n.sample}</span>}
          </div>
        )}
      </div>

      {/* Loop config */}
      {isLoop && side === "s" && (
        <div style={{ paddingLeft: indent + 28, padding: "3px 6px 3px " + (indent + 28) + "px", background: sectionColor?.bg || C.amS, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.t3 }}>Array:</span>
          <select value={lop?.op || "copy_all"} onChange={e => { setFc(""); d({ type: "LOP", lid: n.id, op: e.target.value, cond: "" }); }} style={{ padding: "1px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, fontFamily: C.font, background: C.white, cursor: "pointer" }}>
            <option value="copy_all">📋 Copy all</option>
            <option value="filter">🔍 Filter</option>
            <option value="first">1️⃣ First only</option>
            <option value="agg">Σ Aggregate</option>
          </select>
          {(lop?.op === "filter" || lop?.op === "agg") && (
            <input value={fc} onChange={e => setFc(e.target.value)} onBlur={() => d({ type: "LOP", lid: n.id, op: lop.op, cond: fc })}
              onKeyDown={e => { if (e.key === "Enter") d({ type: "LOP", lid: n.id, op: lop.op, cond: fc }); }}
              placeholder={lop.op === "filter" ? '"only where qty > 0"' : '"sum quantities"'}
              style={{ flex: 1, minWidth: 160, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.focus}`, fontSize: 9, fontFamily: C.font, outline: "none", background: C.white }} />
          )}
        </div>
      )}

      {/* Mapping rule row */}
      {isMapped && side === "s" && (
        <div style={{ paddingLeft: indent + 28, padding: "2px 6px 2px " + (indent + 28) + "px", background: m.ok ? "#eefbf0" : "#fffff5", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, color: C.bl }}>→</span>
          <span style={{ fontSize: 9, fontFamily: C.mono, color: C.pu, fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {partnerNode?.seg}
          </span>
          {!ed ? (
            <button onClick={e => { e.stopPropagation(); setRt(m.rule); setEd(true); }} style={{ padding: "0 5px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.paper, cursor: "pointer", fontSize: 8, color: C.t2, fontFamily: C.font, lineHeight: "16px" }}>
              {m.rule ? "✏️" : "+ Rule"}
            </button>
          ) : (
            <input autoFocus value={rt} onChange={e => setRt(e.target.value)}
              onBlur={() => { d({ type: "RULE", id: m.id, r: rt }); setEd(false); }}
              onKeyDown={e => { if (e.key === "Enter") { d({ type: "RULE", id: m.id, r: rt }); setEd(false); } if (e.key === "Escape") setEd(false); }}
              onClick={e => e.stopPropagation()}
              placeholder='"Convert YYYYMMDD to YYYY-MM-DD"'
              style={{ flex: 1, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.focus}`, fontSize: 9, fontFamily: C.font, outline: "none", background: C.white }} />
          )}
          {m.rule && !ed && <span style={{ fontSize: 9, color: C.pu, fontStyle: "italic", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{m.rule}"</span>}
          <div style={{ display: "flex", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); d({ type: "OK", id: m.id }); }} style={{ padding: "0 5px", borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: "pointer", border: `1px solid ${m.ok ? C.gnB : C.border}`, background: m.ok ? C.gnS : C.paper, color: m.ok ? C.gn : C.bl, fontFamily: C.font, lineHeight: "16px" }}>
              {m.ok ? "✓" : "OK"}
            </button>
            <button onClick={e => { e.stopPropagation(); d({ type: "DEL", id: m.id }); }} style={{ padding: "0 4px", borderRadius: 3, fontSize: 8, cursor: "pointer", border: `1px solid ${C.border}`, background: C.paper, color: C.t3, fontFamily: C.font, lineHeight: "16px" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VISIBILITY ──
function isVis(n, tree, col) {
  for (const p of tree) {
    if (p.kids?.includes(n.id) && col[p.id]) return false;
    if (p.kids) for (const cid of p.kids) {
      const ch = tree.find(x => x.id === cid);
      if (ch?.kids?.includes(n.id) && col[ch.id]) return false;
      if (ch?.kids) for (const gid of ch.kids) {
        const gc = tree.find(x => x.id === gid);
        if (gc?.kids?.includes(n.id) && col[gc.id]) return false;
      }
    }
  }
  return true;
}

// ── EXCEL DOWNLOAD ──
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(script);
  });
}

async function downloadExcel(state) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Field Mapping ──
  const mapHeader = [
    "Row#", "HL Level", "Source Segment", "Source Description", "Source Sample Data", "Data Type",
    "→", "Target BY Field", "Target Description", "BY Section",
    "Mapping Status", "Transformation Rule (English)", "Confirmed"
  ];
  const mapRows = [];
  let row = 1;
  SRC.forEach(srcNode => {
    if (srcNode.type !== "el") return;
    const mapping = state.maps.find(m => m.sid === srcNode.id);
    const tgtNode = mapping ? TGT.find(t => t.id === mapping.tid) : null;
    const hlLevel = srcNode.hl ? `HL-${srcNode.hl} (${HL[srcNode.hl]?.label || ""})` : "Header";
    mapRows.push([
      row++,
      hlLevel,
      srcNode.seg,
      srcNode.label,
      srcNode.sample || "",
      srcNode.note || "",
      "→",
      tgtNode ? tgtNode.seg : "",
      tgtNode ? tgtNode.label : "",
      tgtNode?.bySection || "",
      mapping ? (mapping.ok ? "CONFIRMED" : "MAPPED") : "UNMAPPED",
      mapping?.rule || "",
      mapping?.ok ? "Yes" : "No",
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet([mapHeader, ...mapRows]);
  ws1["!cols"] = [
    { wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 26 }, { wch: 22 },
    { wch: 3 }, { wch: 22 }, { wch: 30 }, { wch: 14 },
    { wch: 14 }, { wch: 45 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Field Mapping");

  // ── Sheet 2: Unmapped Target Fields ──
  const unmappedHeader = ["Row#", "BY Field", "BY Description", "BY Section", "Notes", "Action Required"];
  const unmappedRows = [];
  let uRow = 1;
  TGT.forEach(tgtNode => {
    if (tgtNode.type !== "el") return;
    const mapped = state.maps.find(m => m.tid === tgtNode.id);
    if (!mapped) {
      unmappedRows.push([
        uRow++,
        tgtNode.seg,
        tgtNode.label,
        tgtNode.bySection || "",
        tgtNode.note || "",
        "Needs source mapping or default value",
      ]);
    }
  });
  const ws2 = XLSX.utils.aoa_to_sheet([unmappedHeader, ...unmappedRows]);
  ws2["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Unmapped BY Fields");

  // ── Sheet 3: HL Loop / Array Configuration ──
  const loopHeader = ["Loop", "HL Level", "Description", "Max Occurrences", "Parent Loop", "Array Operation", "Filter / Aggregation Condition"];
  const loopRows = [];
  SRC.forEach(n => {
    if (n.type !== "loop") return;
    const lop = state.loopOps[n.id];
    const ops = { copy_all: "Copy All Items", filter: "Filter (Selective Copy)", first: "First Item Only", agg: "Aggregate (Sum/Concat)" };
    loopRows.push([
      n.seg,
      n.hl ? `HL-${n.hl} (${HL[n.hl]?.label})` : "—",
      n.label,
      n.max || "Unbounded",
      n.parent ? SRC.find(p => p.id === n.parent)?.seg || "" : "Root",
      ops[lop?.op] || "Copy All Items (default)",
      lop?.cond || "",
    ]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet([loopHeader, ...loopRows]);
  ws3["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Loop & Array Config");

  // ── Sheet 4: Business Rules ──
  const ruleHeader = ["Rule#", "Rule Type", "Rule Description (English)", "Applies To", "Active"];
  const ruleTypes = { validation: "Validation", transform: "Transformation", default: "Default Value", condition: "Conditional", lookup: "Lookup Table" };
  const ruleRows = state.rules.map((r, i) => [
    i + 1,
    ruleTypes[r.rt] || r.rt,
    r.text,
    "All fields",
    r.on ? "Yes" : "No",
  ]);
  if (ruleRows.length === 0) ruleRows.push(["—", "—", "(No global rules defined yet)", "—", "—"]);
  const ws4 = XLSX.utils.aoa_to_sheet([ruleHeader, ...ruleRows]);
  ws4["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 60 }, { wch: 14 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Business Rules");

  // ── Sheet 5: Source Schema (Full 856) ──
  const srcHeader = ["Segment/Element", "HL Level", "Type", "Description", "Sample Data", "Notes", "Data Type", "Depth"];
  const srcRows = SRC.map(n => [
    "  ".repeat(n.d) + n.seg,
    n.hl ? `HL-${n.hl}` : "",
    n.type === "el" ? "Element" : n.type === "loop" ? `LOOP (max ${n.max || "N"})` : "Group",
    n.label,
    n.sample || "",
    n.note || "",
    n.type === "el" ? "AN" : "",
    n.d,
  ]);
  const ws5 = XLSX.utils.aoa_to_sheet([srcHeader, ...srcRows]);
  ws5["!cols"] = [{ wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 36 }, { wch: 28 }, { wch: 32 }, { wch: 8 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws5, "Source Schema (856)");

  // ── Sheet 6: Target Schema (Blue Yonder) ──
  const tgtHeader = ["BY Field", "Section", "Type", "Description", "Notes", "Depth"];
  const tgtRows = TGT.map(n => [
    "  ".repeat(n.d) + n.seg,
    n.bySection || "",
    n.type === "el" ? "Field" : n.type === "loop" ? `ARRAY (max ${n.max || "N"})` : "Group",
    n.label,
    n.note || "",
    n.d,
  ]);
  const ws6 = XLSX.utils.aoa_to_sheet([tgtHeader, ...tgtRows]);
  ws6["!cols"] = [{ wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 36 }, { wch: 32 }, { wch: 6 }];
  XLSX.utils.book_append_sheet(wb, ws6, "Target Schema (BY WMS)");

  // ── Sheet 7: Summary & Statistics ──
  const now = new Date().toISOString().split("T")[0];
  const totalSrcEls = SRC.filter(n => n.type === "el").length;
  const totalTgtEls = TGT.filter(n => n.type === "el").length;
  const mappedCount = state.maps.length;
  const confirmedCount = state.maps.filter(m => m.ok).length;
  const withRules = state.maps.filter(m => m.rule).length;
  const summaryData = [
    ["IntegrateOS — Mapping Specification"],
    [],
    ["Document", "Value"],
    ["Mapping Name", "X12 856 ASN → Blue Yonder WMS Inbound ASN"],
    ["Generated Date", now],
    ["Source Format", "X12 856 (Advance Ship Notice / ASN)"],
    ["Target Format", "Blue Yonder WMS Inbound ASN"],
    ["Source HL Levels", "5 (Shipment → Order → Tare → Pack → Item)"],
    [],
    ["Metric", "Count"],
    ["Source Elements", totalSrcEls],
    ["Target Fields", totalTgtEls],
    ["Mapped Fields", mappedCount],
    ["Confirmed Mappings", confirmedCount],
    ["Mappings with Rules", withRules],
    ["Unmapped Target Fields", totalTgtEls - mappedCount],
    ["Global Business Rules", state.rules.length],
    ["Loop/Array Configurations", Object.keys(state.loopOps).length],
    ["Mapping Coverage %", totalTgtEls > 0 ? Math.round((mappedCount / totalTgtEls) * 100) + "%" : "0%"],
    [],
    ["Sheet Index", "Contents"],
    ["1. Field Mapping", "Complete source→target field mapping with rules"],
    ["2. Unmapped BY Fields", "Target fields that still need mapping"],
    ["3. Loop & Array Config", "HL loop array handling (copy/filter/aggregate)"],
    ["4. Business Rules", "Global transformation and validation rules"],
    ["5. Source Schema (856)", "Complete X12 856 structure reference"],
    ["6. Target Schema (BY WMS)", "Complete Blue Yonder field reference"],
    ["7. Summary", "This sheet"],
  ];
  const ws7 = XLSX.utils.aoa_to_sheet(summaryData);
  ws7["!cols"] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws7, "Summary");

  // Move Summary to first position
  const sheetOrder = wb.SheetNames;
  const summaryIdx = sheetOrder.indexOf("Summary");
  if (summaryIdx > 0) {
    sheetOrder.splice(summaryIdx, 1);
    sheetOrder.unshift("Summary");
    wb.SheetNames = sheetOrder;
  }

  XLSX.writeFile(wb, `IntegrateOS_856_to_BlueYonder_Mapping_${now}.xlsx`);
}

export default function App() {
  const [s, d] = useReducer(red, init);
  const [rt, setRt] = useState("validation");
  const [downloading, setDownloading] = useState(false);
  const vs = SRC.filter(n => isVis(n, SRC, s.collapsed));
  const vt = TGT.filter(n => isVis(n, TGT, s.collapsed));
  const stats = { total: s.maps.length, ok: s.maps.filter(m => m.ok).length, srcEl: SRC.filter(n => n.type === "el").length, tgtEl: TGT.filter(n => n.type === "el").length };

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadExcel(s); } catch (e) { console.error(e); alert("Download failed: " + e.message); }
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: C.font, color: C.tx, paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700;800&family=Fira+Code:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0}input::placeholder{color:${C.t3}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.bHard};border-radius:2px}`}</style>

      {/* Header */}
      <div style={{ background: C.paper, borderBottom: `1px solid ${C.bHard}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: 1.5, background: C.bl, transform: "rotate(45deg)" }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>IntegrateOS</span>
          <span style={{ color: C.border }}>|</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.t2 }}>856 ASN → Blue Yonder WMS</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {Object.entries(HL).map(([k, v]) => (
              <span key={k} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: v.bg, color: v.color, fontWeight: 700, fontFamily: C.mono }}>{v.tag}</span>
            ))}
          </div>
          <span style={{ fontSize: 9, fontFamily: C.mono, color: C.t3 }}>{stats.ok}/{stats.total} mapped</span>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: C.border }}>
            <div style={{ height: "100%", borderRadius: 2, background: stats.ok === stats.total && stats.total > 0 ? C.gn : C.bl, width: `${stats.tgtEl > 0 ? (stats.ok / stats.tgtEl) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
          <button onClick={() => d({ type: "AUTO" })} style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${C.bl}33`, background: C.blS, cursor: "pointer", fontSize: 10, fontWeight: 700, color: C.bl, fontFamily: C.font }}>🤖 Auto-Map</button>
          <button onClick={handleDownload} disabled={downloading} style={{
            padding: "3px 10px", borderRadius: 4, border: "none",
            background: downloading ? C.gn : `linear-gradient(135deg, #15803d, #0f766e)`,
            cursor: downloading ? "default" : "pointer", fontSize: 10, fontWeight: 700,
            color: "#fff", fontFamily: C.font,
            boxShadow: "0 1px 4px rgba(21,128,61,0.3)",
            transition: "all 0.3s",
          }}>{downloading ? "✓ Downloaded!" : "📥 Export Excel"}</button>
        </div>
      </div>

      {s.maps.length === 0 && (
        <div style={{ padding: "8px 12px", background: C.blS, borderBottom: `1px solid ${C.bl}22`, fontSize: 10, color: C.bl, display: "flex", gap: 6, alignItems: "center" }}>
          💡 <span><strong>Click source element</strong> (left) → <strong>click target element</strong> (right). Configure <strong>HL loop array handling</strong> per level. Add <strong>English rules</strong> on each mapping. The 856 HL hierarchy (S→O→T→P→I) maps to BY's Container→Item nesting.</span>
        </div>
      )}

      <div style={{ display: "flex" }}>
        {/* SOURCE */}
        <div style={{ flex: 1, borderRight: `2px solid ${C.bHard}`, minWidth: 0 }}>
          <div style={{ padding: "5px 8px", background: C.cream, borderBottom: `1px solid ${C.bHard}`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 2, background: C.blS, color: C.bl, fontFamily: C.mono }}>⟨⟩ X12</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>856 Advance Ship Notice</span>
            <span style={{ fontSize: 9, color: C.t3, marginLeft: "auto" }}>{stats.srcEl} elements · 5 HL levels</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1.3fr 0.8fr", background: C.cream, borderBottom: `1px solid ${C.bHard}`, fontSize: 8, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: 0.8 }}>
            <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>Segment / Element</div>
            <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>Description</div>
            <div style={{ padding: "3px 6px" }}>Sample</div>
          </div>
          <div style={{ maxHeight: "calc(100vh - 155px)", overflowY: "auto" }}>
            {vs.map(n => <Row key={n.id} n={n} side="s" tree={SRC} s={s} d={d} />)}
          </div>
        </div>

        {/* TARGET */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "5px 8px", background: C.cream, borderBottom: `1px solid ${C.bHard}`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 2, background: BY_COLORS.header.bg, color: BY_COLORS.header.color, fontFamily: C.mono }}>BY</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Blue Yonder WMS Inbound ASN</span>
            <span style={{ fontSize: 9, color: C.t3, marginLeft: "auto" }}>{stats.tgtEl} fields · 6 sections</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1.3fr", background: C.cream, borderBottom: `1px solid ${C.bHard}`, fontSize: 8, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: 0.8 }}>
            <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>BY Field</div>
            <div style={{ padding: "3px 6px" }}>Description</div>
          </div>
          <div style={{ maxHeight: "calc(100vh - 155px)", overflowY: "auto" }}>
            {vt.map(n => <Row key={n.id} n={n} side="t" tree={TGT} s={s} d={d} />)}
          </div>
        </div>
      </div>

      {/* Rules bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.paper, borderTop: `2px solid ${C.bHard}`, padding: "6px 12px", boxShadow: "0 -4px 16px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>📐 Rules</span>
          {s.rules.map(r => (
            <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 4, fontSize: 9, background: r.rt === "validation" ? C.amS : r.rt === "transform" ? C.puS : C.tlS, border: `1px solid ${C.border}` }}>
              {r.text}
              <button onClick={() => d({ type: "DRULE", id: r.id })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 8, color: C.rd, padding: 0 }}>✕</button>
            </span>
          ))}
          <select value={rt} onChange={e => setRt(e.target.value)} style={{ padding: "2px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer" }}>
            <option value="validation">✓ Validate</option><option value="transform">🔄 Transform</option><option value="default">🔧 Default</option><option value="condition">⚡ Condition</option><option value="lookup">📋 Lookup</option>
          </select>
          <input value={s.ruleIn} onChange={e => d({ type: "RI", v: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter" && s.ruleIn.trim()) { d({ type: "ARULE", text: s.ruleIn, rt }); d({ type: "RI", v: "" }); } }}
            placeholder='"Convert all dates YYYYMMDD → YYYY-MM-DD for BY" or "Derive FACILITY_CODE from Ship-To GLN via lookup table"'
            style={{ flex: 1, padding: "3px 6px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 10, fontFamily: C.font, outline: "none", background: C.white }} />
          <button onClick={() => { if (s.ruleIn.trim()) { d({ type: "ARULE", text: s.ruleIn, rt }); d({ type: "RI", v: "" }); } }} style={{ padding: "3px 10px", borderRadius: 3, border: "none", cursor: "pointer", background: C.bl, color: "#fff", fontSize: 9, fontWeight: 700 }}>Add</button>
        </div>
      </div>
    </div>
  );
}
