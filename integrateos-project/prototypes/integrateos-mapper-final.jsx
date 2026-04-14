import { useState, useReducer, useMemo } from "react";

const C = {
  bg: "#f3f1ec", paper: "#faf8f5", white: "#fff", cream: "#edeae3",
  border: "#dbd6cb", bHard: "#c2bdb0",
  tx: "#1b1914", t2: "#5a554b", t3: "#999189",
  bl: "#1d4ed8", blS: "#eef2ff",
  gn: "#15803d", gnS: "#f0fdf4", gnB: "#86efac",
  am: "#a16207", amS: "#fefce8",
  rd: "#be123c",
  pu: "#7c3aed", puS: "#f5f3ff",
  tl: "#0f766e",
  or: "#c2410c", orS: "#fff7ed",
  pk: "#be185d",
  font: "'Karla', sans-serif",
  mono: "'Fira Code', monospace",
};

const RT = {
  direct: { l: "Direct Map", i: "→", c: C.bl },
  hardcode: { l: "Hardcode", i: "✎", c: C.pu },
  conditional: { l: "Conditional", i: "⚡", c: C.or },
  suppress: { l: "Do Not Send", i: "⊘", c: C.rd },
  currentDate: { l: "Current Date", i: "📅", c: C.tl },
  currentTime: { l: "Current Time", i: "⏰", c: C.tl },
  autoIncrement: { l: "Auto Increment", i: "#", c: C.am },
  concat: { l: "Concatenate", i: "&", c: C.pk },
  lookup: { l: "Lookup/Convert", i: "📋", c: C.gn },
  formula: { l: "Transform", i: "ƒ", c: C.bl },
  parseXml: { l: "Parse XML Tag", i: "🔍", c: "#6366f1" },
  dateFormat: { l: "Date Convert", i: "🔄", c: C.tl },
  passthrough: { l: "Passthrough", i: "⇢", c: C.gn },
  hlCounter: { l: "HL Counter", i: "⇅", c: C.am },
  splitField: { l: "Split/Substr", i: "✂", c: C.pk },
};

const CUSTS = ["(Base)", "UPS SCS", "Blommer", "RAVAGO", "Zaxbys", "GordonFoods", "Elanco", "Kroger", "MapleHill", "Grainger", "AVON", "Heineken", "NLM", "DirectTV"];
const TX_LABELS = { "204": "204 Load Tender", "990": "990 Response", "214": "214 Shipment Status", "210": "210 Freight Invoice", "850": "850 Purchase Order", "855": "855 PO Ack", "856": "856 ASN", "810": "810 Invoice" };
const FMT_LABELS = { xml: "Internal XML", json: "JSON API", otm_xml: "OTM XML", csv: "CSV/Flat File" };

// Helper to build node
const N = (id, seg, label, d, type, extra = {}) => ({ id, seg, label, d, type, ...extra });

// ── SHARED ENVELOPE (used for all source schemas) ──
const ENV = [
  N("isa", "ISA", "Interchange Control Header", 0, "group", { kids: ["i01","i02","i03","i04","i05","i06","i07","i08","i09","i10","i11","i12","i13","i14","i15","i16"] }),
  N("i01", "ISA*01", "Auth Info Qualifier", 1, "el", { sample: "00" }),
  N("i02", "ISA*02", "Auth Information", 1, "el", { sample: "          " }),
  N("i03", "ISA*03", "Security Info Qualifier", 1, "el", { sample: "00" }),
  N("i04", "ISA*04", "Security Information", 1, "el", { sample: "          " }),
  N("i05", "ISA*05", "Sender ID Qualifier", 1, "el", { sample: "ZZ" }),
  N("i06", "ISA*06", "Interchange Sender ID", 1, "el", { sample: "UPSSCNL" }),
  N("i07", "ISA*07", "Receiver ID Qualifier", 1, "el", { sample: "02" }),
  N("i08", "ISA*08", "Interchange Receiver ID", 1, "el", { sample: "CLLQ" }),
  N("i09", "ISA*09", "Interchange Date", 1, "el", { sample: "20250318" }),
  N("i10", "ISA*10", "Interchange Time", 1, "el", { sample: "1430" }),
  N("i11", "ISA*11", "Repetition Separator", 1, "el", { sample: "U" }),
  N("i12", "ISA*12", "Control Version #", 1, "el", { sample: "00401" }),
  N("i13", "ISA*13", "Interchange Control #", 1, "el", { sample: "000017090" }),
  N("i14", "ISA*14", "Ack Requested", 1, "el", { sample: "0" }),
  N("i15", "ISA*15", "Usage Indicator", 1, "el", { sample: "P" }),
  N("i16", "ISA*16", "Component Separator", 1, "el", { sample: '"' }),
  N("gs", "GS", "Functional Group Header", 0, "group", { kids: ["g01","g02","g03","g04","g05","g06","g07","g08"] }),
  N("g01", "GS*01", "Functional ID Code", 1, "el", { sample: "SM" }),
  N("g02", "GS*02", "App Sender Code", 1, "el", { sample: "UPSSCNL" }),
  N("g03", "GS*03", "App Receiver Code", 1, "el", { sample: "CLLQ" }),
  N("g04", "GS*04", "Date", 1, "el", { sample: "20250318" }),
  N("g05", "GS*05", "Time", 1, "el", { sample: "143000" }),
  N("g06", "GS*06", "Group Control #", 1, "el", { sample: "1709" }),
  N("g07", "GS*07", "Agency Code", 1, "el", { sample: "X" }),
  N("g08", "GS*08", "Version Code", 1, "el", { sample: "004010" }),
  N("st", "ST", "Transaction Set Header", 0, "group", { kids: ["s01","s02"] }),
  N("s01", "ST*01", "TX Set ID", 1, "el", { sample: "204" }),
  N("s02", "ST*02", "TX Set Control #", 1, "el", { sample: "017090001" }),
];

// ── SOURCE BODIES per TX type ──
const SRC_BODY = {
  "204": [
    N("b2", "B2", "Shipment Beginning", 0, "group", { kids: ["b202","b204","b206"] }),
    N("b202", "B2*02", "SCAC", 1, "el", { sample: "CLNL" }),
    N("b204", "B2*04", "Shipment ID", 1, "el", { sample: "LD23029450" }),
    N("b206", "B2*06", "Payment Method", 1, "el", { sample: "PP" }),
    N("b2a", "B2A", "Purpose", 0, "group", { kids: ["b2a1","b2a2"] }),
    N("b2a1", "B2A*01", "Purpose Code", 1, "el", { sample: "00" }),
    N("b2a2", "B2A*02", "App Type", 1, "el", { sample: "LT" }),
    N("hl1", "L11 (Hdr)", "Header Refs", 0, "loop", { max: "99", kids: ["hl101","hl102","hl103"] }),
    N("hl101", "L11*01", "Reference ID", 1, "el", { sample: "LD23029450" }),
    N("hl102", "L11*02", "Ref Qualifier", 1, "el", { sample: "BM" }),
    N("hl103", "L11*03", "Description", 1, "el", { sample: "LOAD ID" }),
    N("nte", "NTE", "Notes", 0, "loop", { max: "10", kids: ["nte2"] }),
    N("nte2", "NTE*02", "Note Text", 1, "el", { sample: "CHECK-IN GATE B" }),
    N("n7g", "N7", "Equipment", 0, "group", { kids: ["n702","n711"] }),
    N("n702", "N7*02", "Equip Number", 1, "el", { sample: "0" }),
    N("n711", "N7*11", "Equip Type", 1, "el", { sample: "TL" }),
    N("n1h", "N1 (Hdr)", "Parties", 0, "loop", { max: "5", kids: ["n1h1","n1h2","n1h3","n1h4","n3h1","n4h1","n4h2","n4h3","n4h4"] }),
    N("n1h1", "N1*01", "Entity Code", 1, "el", { sample: "BT" }),
    N("n1h2", "N1*02", "Name", 1, "el", { sample: "UPS SCS" }),
    N("n1h3", "N1*03", "ID Qualifier", 1, "el", { sample: "93" }),
    N("n1h4", "N1*04", "ID Code", 1, "el", { sample: "UPSSCSNL" }),
    N("n3h1", "N3*01", "Address", 1, "el", { sample: "LUCHTHAVENWEG 57" }),
    N("n4h1", "N4*01", "City", 1, "el", { sample: "EINDHOVEN" }),
    N("n4h2", "N4*02", "State", 1, "el", { sample: "NB" }),
    N("n4h3", "N4*03", "Postal Code", 1, "el", { sample: "5657 EA" }),
    N("n4h4", "N4*04", "Country", 1, "el", { sample: "NL" }),
    N("s5", "S5 Loop", "Stops", 0, "loop", { max: "999", kids: ["s501","s502","sl11","sl111","sl112","sg621","sg622","sg624","sa801","sa803","sa805","sn101","sn102","sn301","sn401","sn402","sn403","sn404"] }),
    N("s501", "S5*01", "Stop Seq #", 1, "el", { sample: "1" }),
    N("s502", "S5*02", "Reason Code", 1, "el", { sample: "CL" }),
    N("sl11", "L11 (Stop)", "Stop Refs", 1, "loop", { max: "99", kids: ["sl111","sl112"] }),
    N("sl111", "L11*01 (Stop)", "Stop Ref ID", 2, "el", { sample: "EUNLDELL01" }),
    N("sl112", "L11*02 (Stop)", "Stop Ref Qual", 2, "el", { sample: "11" }),
    N("sg621", "G62*01", "Date Qualifier", 1, "el", { sample: "37" }),
    N("sg622", "G62*02", "Date", 1, "el", { sample: "20250825" }),
    N("sg624", "G62*04", "Time", 1, "el", { sample: "130000" }),
    N("sa801", "AT8*01", "Weight Qual", 1, "el", { sample: "G" }),
    N("sa803", "AT8*03", "Weight", 1, "el", { sample: "42500" }),
    N("sa805", "AT8*05", "Lading Qty", 1, "el", { sample: "33" }),
    N("sn101", "N1*01 (Stop)", "Entity Code", 1, "el", { sample: "SH" }),
    N("sn102", "N1*02 (Stop)", "Name", 1, "el", { sample: "DELL" }),
    N("sn301", "N3*01 (Stop)", "Address", 1, "el", { sample: "100 DELL WAY" }),
    N("sn401", "N4*01 (Stop)", "City", 1, "el", { sample: "ROUND ROCK" }),
    N("sn402", "N4*02 (Stop)", "State", 1, "el", { sample: "TX" }),
    N("sn403", "N4*03 (Stop)", "Zip", 1, "el", { sample: "78682" }),
    N("sn404", "N4*04 (Stop)", "Country", 1, "el", { sample: "US" }),
    N("l3g", "L3", "Totals", 0, "group", { kids: ["l301","l303","l305"] }),
    N("l301", "L3*01", "Weight", 1, "el", { sample: "42500" }),
    N("l303", "L3*03", "Freight Rate", 1, "el", { sample: "1250.00" }),
    N("l305", "L3*05", "Total Charges", 1, "el", { sample: "1250.00" }),
  ],
  "990": [
    N("b1", "B1", "Response Beginning", 0, "group", { kids: ["b101","b102","b103","b104"] }),
    N("b101", "B1*01", "SCAC", 1, "el", { sample: "CLLQ" }),
    N("b102", "B1*02", "Shipment ID", 1, "el", { sample: "LD23490685" }),
    N("b103", "B1*03", "Date", 1, "el", { sample: "20250901" }),
    N("b104", "B1*04", "Action Code", 1, "el", { sample: "A" }),
    N("n9r", "N9", "References", 0, "loop", { max: "10", kids: ["n901","n902"] }),
    N("n901", "N9*01", "Ref Qualifier", 1, "el", { sample: "CN" }),
    N("n902", "N9*02", "Ref ID", 1, "el", { sample: "LD23490685" }),
    N("k1g", "K1", "Decline Remarks", 0, "group", { kids: ["k101"] }),
    N("k101", "K1*01", "Free Form Message", 1, "el", { sample: "EQUIP NOT AVAIL" }),
  ],
  "214": [
    N("b10", "B10", "Status Beginning", 0, "group", { kids: ["b1001","b1002","b1003"] }),
    N("b1001", "B10*01", "Reference ID", 1, "el", { sample: "16566270" }),
    N("b1002", "B10*02", "Shipment ID", 1, "el", { sample: "T2120" }),
    N("b1003", "B10*03", "SCAC", 1, "el", { sample: "CLLQ" }),
    N("l114", "L11", "Reference", 0, "group", { kids: ["l11401","l11402"] }),
    N("l11401", "L11*01", "Ref ID", 1, "el", { sample: "16566270" }),
    N("l11402", "L11*02", "Ref Qualifier", 1, "el", { sample: "CN" }),
    N("n1l4", "N1 Loop", "Parties", 0, "loop", { max: "3", kids: ["n14_01","n14_02","n34_01","n44_01","n44_02","n44_03","n44_04"] }),
    N("n14_01", "N1*01", "Entity Code", 1, "el", { sample: "SH" }),
    N("n14_02", "N1*02", "Name", 1, "el", { sample: "LINEAGE LOGISTICS" }),
    N("n34_01", "N3*01", "Address", 1, "el", { sample: "2501 BROADWAY" }),
    N("n44_01", "N4*01", "City", 1, "el", { sample: "CHEEKTOWAGA" }),
    N("n44_02", "N4*02", "State", 1, "el", { sample: "NY" }),
    N("n44_03", "N4*03", "Zip", 1, "el", { sample: "14227" }),
    N("n44_04", "N4*04", "Country", 1, "el", { sample: "US" }),
    N("lx4", "LX", "Assigned Number", 0, "group", { kids: ["lx401"] }),
    N("lx401", "LX*01", "Assigned #", 1, "el", { sample: "1" }),
    N("at7", "AT7", "Status Detail", 0, "group", { kids: ["at701","at702","at703","at704","at705","at706","at707"] }),
    N("at701", "AT7*01", "Status Code", 1, "el", { sample: "X1" }),
    N("at702", "AT7*02", "Reason Code", 1, "el", { sample: "NS" }),
    N("at703", "AT7*03", "Appt Status", 1, "el", { sample: "" }),
    N("at704", "AT7*04", "Appt Reason", 1, "el", { sample: "" }),
    N("at705", "AT7*05", "Date", 1, "el", { sample: "20250509" }),
    N("at706", "AT7*06", "Time", 1, "el", { sample: "1230" }),
    N("at707", "AT7*07", "Time Code", 1, "el", { sample: "PT" }),
    N("ms1", "MS1", "Location", 0, "group", { kids: ["ms101","ms102","ms103"] }),
    N("ms101", "MS1*01", "City", 1, "el", { sample: "RIVERSIDE" }),
    N("ms102", "MS1*02", "State", 1, "el", { sample: "CA" }),
    N("ms103", "MS1*03", "Country", 1, "el", { sample: "USA" }),
    N("ms2", "MS2", "Equipment ID", 0, "group", { kids: ["ms201","ms202"] }),
    N("ms201", "MS2*01", "SCAC", 1, "el", { sample: "CLLQ" }),
    N("ms202", "MS2*02", "Equip #", 1, "el", { sample: "TRL-447821" }),
  ],
  "210": [
    N("b3", "B3", "Invoice Beginning", 0, "group", { kids: ["b302","b303","b304","b305","b306","b307","b309","b310","b311","b312"] }),
    N("b302", "B3*02", "Invoice #", 1, "el", { sample: "3262611601" }),
    N("b303", "B3*03", "Shipment ID", 1, "el", { sample: "769933" }),
    N("b304", "B3*04", "Payment Method", 1, "el", { sample: "CC" }),
    N("b305", "B3*05", "Weight Unit", 1, "el", { sample: "" }),
    N("b306", "B3*06", "Invoice Date", 1, "el", { sample: "20250602" }),
    N("b307", "B3*07", "Net Amount Due", 1, "el", { sample: "157408" }),
    N("b309", "B3*09", "Delivery Date", 1, "el", { sample: "20250119" }),
    N("b310", "B3*10", "Date Variation", 1, "el", { sample: "035" }),
    N("b311", "B3*11", "SCAC", 1, "el", { sample: "CLLQ" }),
    N("b312", "B3*12", "Payment Due Date", 1, "el", { sample: "20250702" }),
    N("c3g", "C3", "Currency", 0, "group", { kids: ["c301"] }),
    N("c301", "C3*01", "Currency Code", 1, "el", { sample: "USD" }),
    N("n92", "N9 Loop", "References", 0, "loop", { max: "99", kids: ["n9201","n9202"] }),
    N("n9201", "N9*01", "Ref Qualifier", 1, "el", { sample: "PO" }),
    N("n9202", "N9*02", "Ref ID", 1, "el", { sample: "769933" }),
    N("n12", "N1 Loop", "Parties", 0, "loop", { max: "5", kids: ["n1201","n1202","n3201","n4201","n4202","n4203"] }),
    N("n1201", "N1*01", "Entity Code", 1, "el", { sample: "SH" }),
    N("n1202", "N1*02", "Name", 1, "el", { sample: "ELYRIA CENTRAL" }),
    N("n3201", "N3*01", "Address", 1, "el", { sample: "800 LOGISTICS DR" }),
    N("n4201", "N4*01", "City", 1, "el", { sample: "ELYRIA" }),
    N("n4202", "N4*02", "State", 1, "el", { sample: "OH" }),
    N("n4203", "N4*03", "Zip", 1, "el", { sample: "44035" }),
    N("lxl", "LX Loop", "Line Items", 0, "loop", { max: "999", kids: ["lx201","l501","l502","l002","l008","l101","l103","l104","l108"] }),
    N("lx201", "LX*01", "Line #", 1, "el", { sample: "1" }),
    N("l501", "L5*01", "Lading Line #", 1, "el", { sample: "1" }),
    N("l502", "L5*02", "Description", 1, "el", { sample: "FAK" }),
    N("l002", "L0*02", "Billed Weight", 1, "el", { sample: "42500" }),
    N("l008", "L0*08", "Lading Qty", 1, "el", { sample: "24" }),
    N("l101", "L1*01", "Item #", 1, "el", { sample: "1" }),
    N("l103", "L1*03", "Rate", 1, "el", { sample: "450" }),
    N("l104", "L1*04", "Charge", 1, "el", { sample: "1250.00" }),
    N("l108", "L1*08", "Charge Code", 1, "el", { sample: "400" }),
    N("l3t", "L3", "Totals", 0, "group", { kids: ["l3t01","l3t02","l3t05"] }),
    N("l3t01", "L3*01", "Total Weight", 1, "el", { sample: "42500" }),
    N("l3t02", "L3*02", "Total Freight", 1, "el", { sample: "1250.00" }),
    N("l3t05", "L3*05", "Amount Due", 1, "el", { sample: "1562.50" }),
  ],
  "850": [
    N("beg", "BEG", "PO Beginning", 0, "group", { kids: ["bg01","bg02","bg03","bg05","bg06"] }),
    N("bg01", "BEG*01", "Purpose Code", 1, "el", { sample: "00" }),
    N("bg02", "BEG*02", "PO Type", 1, "el", { sample: "NE" }),
    N("bg03", "BEG*03", "PO Number", 1, "el", { sample: "PO-2024-88712" }),
    N("bg05", "BEG*05", "PO Date", 1, "el", { sample: "20240315" }),
    N("bg06", "BEG*06", "Contract #", 1, "el", { sample: "CNT-4420" }),
    N("n18", "N1 Loop", "Parties", 0, "loop", { max: "10", kids: ["n1801","n1802","n1804","n3801","n4801","n4802","n4803"] }),
    N("n1801", "N1*01", "Entity Code", 1, "el", { sample: "ST" }),
    N("n1802", "N1*02", "Name", 1, "el", { sample: "Kroger DC #847" }),
    N("n1804", "N1*04", "ID (GLN)", 1, "el", { sample: "0078742000847" }),
    N("n3801", "N3*01", "Address", 1, "el", { sample: "1200 Distribution Way" }),
    N("n4801", "N4*01", "City", 1, "el", { sample: "Nashville" }),
    N("n4802", "N4*02", "State", 1, "el", { sample: "TN" }),
    N("n4803", "N4*03", "Zip", 1, "el", { sample: "37201" }),
    N("po1", "PO1 Loop", "Line Items", 0, "loop", { max: "999", kids: ["po101","po102","po103","po104","po107","po109","pid5","sdq","sdq1","sdq2","sdq3"] }),
    N("po101", "PO1*01", "Line #", 1, "el", { sample: "1" }),
    N("po102", "PO1*02", "Qty Ordered", 1, "el", { sample: "48" }),
    N("po103", "PO1*03", "UOM", 1, "el", { sample: "CA" }),
    N("po104", "PO1*04", "Unit Price", 1, "el", { sample: "24.99" }),
    N("po107", "PO1*07", "UPC", 1, "el", { sample: "012345678905" }),
    N("po109", "PO1*09", "Buyer Item #", 1, "el", { sample: "KRG-44521" }),
    N("pid5", "PID*05", "Description", 1, "el", { sample: "Organic Wheat Bread" }),
    N("sdq", "SDQ Loop", "Store Allocation", 1, "loop", { max: "50", kids: ["sdq1","sdq2","sdq3"] }),
    N("sdq1", "SDQ*01", "UOM", 2, "el", { sample: "CA" }),
    N("sdq2", "SDQ*02", "Store ID", 2, "el", { sample: "STR-0847" }),
    N("sdq3", "SDQ*03", "Qty", 2, "el", { sample: "12" }),
  ],
  "856": [
    N("bsn", "BSN", "Ship Notice Header", 0, "group", { kids: ["bsn1","bsn2","bsn3","bsn4"] }),
    N("bsn1", "BSN*01", "Purpose Code", 1, "el", { sample: "00" }),
    N("bsn2", "BSN*02", "Shipment ID", 1, "el", { sample: "SHP-99841" }),
    N("bsn3", "BSN*03", "Ship Date", 1, "el", { sample: "20240318" }),
    N("bsn4", "BSN*04", "Ship Time", 1, "el", { sample: "1430" }),
    N("hls", "HL (S)", "Shipment Level", 0, "loop", { max: "1", kids: ["td102","td503","td504","td303","refbol","dtms","dtmd","n1sf","n1st"] }),
    N("td102", "TD1*02", "# Pallets", 1, "el", { sample: "12" }),
    N("td503", "TD5*03", "Carrier SCAC", 1, "el", { sample: "ODFL" }),
    N("td504", "TD5*04", "Transport Mode", 1, "el", { sample: "M" }),
    N("td303", "TD3*03", "Trailer #", 1, "el", { sample: "ODFL-44872" }),
    N("refbol", "REF*BM", "BOL #", 1, "el", { sample: "BOL-887421" }),
    N("dtms", "DTM*011", "Shipped Date", 1, "el", { sample: "20240318" }),
    N("dtmd", "DTM*017", "Est Delivery", 1, "el", { sample: "20240320" }),
    N("n1sf", "N1*SF", "Ship From Name", 1, "el", { sample: "AIT Dallas DC" }),
    N("n1st", "N1*ST", "Ship To Name", 1, "el", { sample: "Kroger DC #847" }),
    N("hlo", "HL (O)", "Order Level", 0, "loop", { max: "999", kids: ["prf1","prf4"] }),
    N("prf1", "PRF*01", "PO Number", 1, "el", { sample: "PO-88712" }),
    N("prf4", "PRF*04", "PO Date", 1, "el", { sample: "20240310" }),
    N("hlt", "HL (T)", "Tare / Pallet", 0, "loop", { max: "9999", kids: ["mansst","po4c","po4w"] }),
    N("mansst", "MAN*GM (T)", "SSCC-18 Pallet", 1, "el", { sample: "00300712345600001234" }),
    N("po4c", "PO4*01 (T)", "Cases/Pallet", 1, "el", { sample: "48" }),
    N("po4w", "PO4*08 (T)", "Pallet Weight", 1, "el", { sample: "1842.5" }),
    N("hlp", "HL (P)", "Pack / Case", 0, "loop", { max: "9999", kids: ["manssp","sn1qp"] }),
    N("manssp", "MAN*GM (P)", "SSCC-18 Case", 1, "el", { sample: "00300712345600005678" }),
    N("sn1qp", "SN1*02 (P)", "Qty (Case)", 1, "el", { sample: "48" }),
    N("hli", "HL (I)", "Item Level", 0, "loop", { max: "9999", kids: ["liupc","ligtin","lisku","sn1q","sn1u","pidesc","meawt","rflot","rfexp"] }),
    N("liupc", "LIN*UP", "UPC-12", 1, "el", { sample: "012345678905" }),
    N("ligtin", "LIN*EN", "GTIN-14", 1, "el", { sample: "10012345678902" }),
    N("lisku", "LIN*IN", "Buyer Item #", 1, "el", { sample: "KRG-44521" }),
    N("sn1q", "SN1*02", "Qty Shipped", 1, "el", { sample: "576" }),
    N("sn1u", "SN1*03", "UOM", 1, "el", { sample: "EA" }),
    N("pidesc", "PID*F*08", "Description", 1, "el", { sample: "Organic Wheat Bread" }),
    N("meawt", "MEA*PD*WT", "Catch Weight", 1, "el", { sample: "1.65" }),
    N("rflot", "REF*LT", "Lot #", 1, "el", { sample: "LOT-2024-A117" }),
    N("rfexp", "REF*EXP", "Expiry Date", 1, "el", { sample: "20241215" }),
  ],
  "855": [
    N("bak", "BAK", "PO Ack Beginning", 0, "group", { kids: ["bak1","bak2","bak3","bak4"] }),
    N("bak1", "BAK*01", "Ack Type", 1, "el", { sample: "AC" }),
    N("bak2", "BAK*02", "Purpose Code", 1, "el", { sample: "00" }),
    N("bak3", "BAK*03", "PO Number", 1, "el", { sample: "PO-88712" }),
    N("bak4", "BAK*04", "PO Date", 1, "el", { sample: "20240315" }),
    N("ak1", "AK1 Loop", "Line Item Ack", 0, "loop", { max: "999", kids: ["ak101","ak102","ak103","ak104","ak105"] }),
    N("ak101", "AK1*01", "Line #", 1, "el", { sample: "1" }),
    N("ak102", "AK1*02", "Qty Ordered", 1, "el", { sample: "48" }),
    N("ak103", "AK1*03", "UOM", 1, "el", { sample: "CA" }),
    N("ak104", "AK1*04", "Unit Price", 1, "el", { sample: "24.99" }),
    N("ak105", "AK1*05", "Line Status", 1, "el", { sample: "IA" }),
  ],
  "810": [
    N("big", "BIG", "Invoice Beginning", 0, "group", { kids: ["big1","big2","big3","big4"] }),
    N("big1", "BIG*01", "Invoice Date", 1, "el", { sample: "20240320" }),
    N("big2", "BIG*02", "Invoice #", 1, "el", { sample: "INV-88421" }),
    N("big3", "BIG*03", "PO Date", 1, "el", { sample: "20240315" }),
    N("big4", "BIG*04", "PO Number", 1, "el", { sample: "PO-88712" }),
    N("it1", "IT1 Loop", "Line Items", 0, "loop", { max: "999", kids: ["it101","it102","it103","it104","it107"] }),
    N("it101", "IT1*01", "Line #", 1, "el", { sample: "1" }),
    N("it102", "IT1*02", "Qty Invoiced", 1, "el", { sample: "48" }),
    N("it103", "IT1*03", "UOM", 1, "el", { sample: "CA" }),
    N("it104", "IT1*04", "Unit Price", 1, "el", { sample: "24.99" }),
    N("it107", "IT1*07", "UPC", 1, "el", { sample: "012345678905" }),
    N("tds", "TDS", "Total Amount", 0, "group", { kids: ["tds1"] }),
    N("tds1", "TDS*01", "Total Invoice Amt", 1, "el", { sample: "119952" }),
  ],
};

// ── TARGET SCHEMAS (hand-crafted per format) ──
const TGT_SCHEMAS = {
  xml: {
    "204": [
      N("tx01","interchangeSenderID","Sender ID",0,"el"),N("tx02","interchangeReceiverID","Receiver ID",0,"el"),N("tx03","applicationSendersCode","App Sender",0,"el"),N("tx04","applicationReceiversCode","App Receiver",0,"el"),
      N("tx05","standardCarrierAlphaCode","SCAC",0,"el"),N("tx06","shipmentIdentificationNumber","Shipment ID",0,"el"),N("tx07","shipmentMethodOfPayment","Payment Method",0,"el"),
      N("tx08","transactionSetPurposeCode","Purpose Code",0,"el"),N("tx09","applicationType","App Type",0,"el"),
      N("txl1","L11_list","Header Refs",0,"loop",{max:"99",kids:["txl11","txl12","txl13"]}),N("txl11","referenceIdentification","Ref ID",1,"el"),N("txl12","referenceIdentificationQualifier","Ref Qualifier",1,"el"),N("txl13","description","Description",1,"el"),
      N("txn1","noteReferenceCode","Note Code",0,"el"),N("txn2","freeFormMessage","Note Text",0,"el"),
      N("txe1","equipmentNumber","Equip #",0,"el"),N("txe2","equipmentDescriptionCode","Equip Type",0,"el"),
      N("txp1","Loop0100/N1","Parties",0,"loop",{max:"5",kids:["txp11","txp12","txp13","txp14","txp15","txp16","txp17","txp18","txp19"]}),
      N("txp11","entityIdentifierCode","Entity Code",1,"el"),N("txp12","name","Name",1,"el"),N("txp13","identificationCodeQualifier","ID Qual",1,"el"),N("txp14","identificationCode","ID Code",1,"el"),
      N("txp15","addressInformation","Address",1,"el"),N("txp16","cityName","City",1,"el"),N("txp17","stateOrProvinceCode","State",1,"el"),N("txp18","postalCode","Zip",1,"el"),N("txp19","countryCode","Country",1,"el"),
      N("txs1","Loop0300/S5","Stops",0,"loop",{max:"999",kids:["txs11","txs12","txs13","txs14","txs15","txs16","txs17","txs18","txs19","txs1a","txs1b","txs1c","txs1d","txs1e","txs1f"]}),
      N("txs11","stopSequenceNumber","Stop Seq",1,"el"),N("txs12","stopReasonCode","Reason",1,"el"),
      N("txs13","Loop0310/L11/refId","Stop Ref ID",1,"el"),N("txs14","Loop0310/L11/refQual","Stop Ref Qual",1,"el"),
      N("txs15","G62/date","Stop Date",1,"el"),N("txs16","G62/time","Stop Time",1,"el"),
      N("txs17","AT8/weight","Weight",1,"el"),N("txs18","AT8/weightQualifier","Weight Qual",1,"el"),N("txs19","AT8/ladingQuantity","Lading Qty",1,"el"),
      N("txs1a","N1/entityIdentifierCode","Entity Code",1,"el"),N("txs1b","N1/name","Party Name",1,"el"),
      N("txs1c","N3/addressInformation","Address",1,"el"),N("txs1d","N4/cityName","City",1,"el"),N("txs1e","N4/stateOrProvinceCode","State",1,"el"),N("txs1f","N4/postalCode","Zip",1,"el"),
      N("txw1","weight","Total Weight",0,"el"),N("txw2","freightRate","Freight Rate",0,"el"),N("txw3","totalCharges","Total Charges",0,"el"),
    ],
    "990": [N("t91","standardCarrierAlphaCode","SCAC",0,"el"),N("t92","shipmentIdentificationNumber","Shipment ID",0,"el"),N("t93","date","Date",0,"el"),N("t94","reservationActionCode","Action Code",0,"el"),N("t95","N9/referenceIdentificationQualifier","Ref Qual",0,"el"),N("t96","N9/referenceIdentification","Ref ID",0,"el"),N("t97","K1/freeFormMessage","Decline Reason",0,"el")],
    "214": [N("t41","B10/referenceIdentification","Ref ID",0,"el"),N("t42","B10/shipmentIdentification","Shipment ID",0,"el"),N("t43","B10/standardCarrierAlphaCode","SCAC",0,"el"),N("t44","L11/referenceIdentification","Ref ID",0,"el"),N("t45","L11/referenceIdentificationQualifier","Ref Qual",0,"el"),N("t46","Loop0100/N1","Parties",0,"loop",{max:"3",kids:["t461","t462","t463","t464","t465","t466","t467"]}),N("t461","entityIdentifierCode","Entity Code",1,"el"),N("t462","name","Name",1,"el"),N("t463","addressInformation","Address",1,"el"),N("t464","cityName","City",1,"el"),N("t465","stateOrProvinceCode","State",1,"el"),N("t466","postalCode","Zip",1,"el"),N("t467","countryCode","Country",1,"el"),N("t47","LX/assignedNumber","Assigned #",0,"el"),N("t48","AT7/shipmentStatusCode","Status Code",0,"el"),N("t49","AT7/statusReasonCode","Reason Code",0,"el"),N("t4a","AT7/date","Event Date",0,"el"),N("t4b","AT7/time","Event Time",0,"el"),N("t4c","AT7/timeCode","Time Zone",0,"el"),N("t4d","MS1/cityName","Location City",0,"el"),N("t4e","MS1/stateOrProvinceCode","Location State",0,"el"),N("t4f","MS2/equipmentNumber","Equipment #",0,"el")],
    "210": [N("t21","B3/invoiceNumber","Invoice #",0,"el"),N("t22","B3/shipmentIdentificationNumber","Shipment ID",0,"el"),N("t23","B3/shipmentMethodOfPayment","Payment",0,"el"),N("t24","B3/date","Invoice Date",0,"el"),N("t25","B3/netAmountDue","Amount Due",0,"el"),N("t26","B3/deliveryDate","Delivery Date",0,"el"),N("t27","B3/standardCarrierAlphaCode","SCAC",0,"el"),N("t28","B3/paymentDueDate","Due Date",0,"el"),N("t29","C3/currencyCode","Currency",0,"el"),N("t2a","N9 Loop","Refs",0,"loop",{max:"99",kids:["t2a1","t2a2"]}),N("t2a1","referenceIdentificationQualifier","Ref Qual",1,"el"),N("t2a2","referenceIdentification","Ref ID",1,"el"),N("t2b","LX Loop","Line Items",0,"loop",{max:"999",kids:["t2b1","t2b2","t2b3","t2b4","t2b5"]}),N("t2b1","lineNumber","Line #",1,"el"),N("t2b2","ladingDescription","Description",1,"el"),N("t2b3","billedWeight","Weight",1,"el"),N("t2b4","freightRate","Rate",1,"el"),N("t2b5","charge","Charge",1,"el"),N("t2c","L3/totalWeight","Total Weight",0,"el"),N("t2d","L3/totalCharges","Total Charges",0,"el")],
    "850": [N("t81","transactionSetPurposeCode","Purpose",0,"el"),N("t82","purchaseOrderNumber","PO #",0,"el"),N("t83","purchaseOrderDate","PO Date",0,"el"),N("t84","N1 Loop","Parties",0,"loop",{max:"10",kids:["t841","t842","t843","t844","t845","t846"]}),N("t841","entityIdentifierCode","Entity Code",1,"el"),N("t842","name","Name",1,"el"),N("t843","identificationCode","GLN",1,"el"),N("t844","addressInformation","Address",1,"el"),N("t845","cityName","City",1,"el"),N("t846","postalCode","Zip",1,"el"),N("t85","PO1 Loop","Line Items",0,"loop",{max:"999",kids:["t851","t852","t853","t854","t855","t856","t857"]}),N("t851","lineNumber","Line #",1,"el"),N("t852","quantityOrdered","Qty",1,"el"),N("t853","unitOfMeasure","UOM",1,"el"),N("t854","unitPrice","Price",1,"el"),N("t855","productId","UPC",1,"el"),N("t856","buyerItemNumber","Buyer SKU",1,"el"),N("t857","description","Description",1,"el")],
    "856": [N("t61","BSN/shipmentIdentification","Shipment ID",0,"el"),N("t62","BSN/shipmentDate","Ship Date",0,"el"),N("t63","TD5/carrierSCAC","SCAC",0,"el"),N("t64","TD3/trailerNumber","Trailer #",0,"el"),N("t65","REF/bolNumber","BOL #",0,"el"),N("t66","HL-O Loop","Orders",0,"loop",{max:"999",kids:["t661","t662"]}),N("t661","PRF/poNumber","PO #",1,"el"),N("t662","PRF/poDate","PO Date",1,"el"),N("t67","HL-T Loop","Pallets",0,"loop",{max:"9999",kids:["t671","t672","t673"]}),N("t671","MAN/sscc18","Pallet SSCC",1,"el"),N("t672","PO4/casesPerPallet","Cases",1,"el"),N("t673","PO4/grossWeight","Weight",1,"el"),N("t68","HL-I Loop","Items",0,"loop",{max:"9999",kids:["t681","t682","t683","t684","t685","t686"]}),N("t681","LIN/upc","UPC",1,"el"),N("t682","LIN/gtin","GTIN",1,"el"),N("t683","SN1/qtyShipped","Qty",1,"el"),N("t684","PID/description","Desc",1,"el"),N("t685","MEA/weight","Weight",1,"el"),N("t686","REF/lotNumber","Lot #",1,"el")],
    "855": [N("ta1","ackType","Ack Type",0,"el"),N("ta2","poNumber","PO #",0,"el"),N("ta3","poDate","PO Date",0,"el"),N("ta4","Line Loop","Lines",0,"loop",{max:"999",kids:["ta41","ta42","ta43"]}),N("ta41","lineNumber","Line #",1,"el"),N("ta42","quantity","Qty",1,"el"),N("ta43","lineStatus","Status",1,"el")],
    "810": [N("tb1","invoiceDate","Invoice Date",0,"el"),N("tb2","invoiceNumber","Invoice #",0,"el"),N("tb3","poNumber","PO #",0,"el"),N("tb4","IT1 Loop","Lines",0,"loop",{max:"999",kids:["tb41","tb42","tb43","tb44"]}),N("tb41","lineNumber","Line #",1,"el"),N("tb42","qtyInvoiced","Qty",1,"el"),N("tb43","unitPrice","Price",1,"el"),N("tb44","upc","UPC",1,"el"),N("tb5","totalAmount","Total",0,"el")],
  },
  json: {
    _default: [N("j1",".carrierScac","Carrier SCAC",0,"el"),N("j2",".shipmentId","Shipment ID",0,"el"),N("j3",".status","Status",0,"el"),N("j4",".references[]","Refs",0,"loop",{max:"N",kids:["j41","j42"]}),N("j41",".qualifier","Qualifier",1,"el"),N("j42",".value","Value",1,"el"),N("j5",".stops[]","Stops",0,"loop",{max:"N",kids:["j51","j52","j53","j54","j55","j56"]}),N("j51",".stopType","Type",1,"el"),N("j52",".location.name","Name",1,"el"),N("j53",".location.city","City",1,"el"),N("j54",".location.state","State",1,"el"),N("j55",".eventDate","Date",1,"el"),N("j56",".eventTime","Time",1,"el"),N("j6",".weight","Weight",0,"el"),N("j7",".pieces","Pieces",0,"el")],
  },
  otm_xml: {
    _default: [N("o1","TransmissionHeader/GLogDate","Create Date",0,"el"),N("o2","TransmissionHeader/SenderSystemID","Sender",0,"el"),N("o3","PlannedShipment/ShipmentGid","Shipment ID",0,"el"),N("o4","PlannedShipment/ServProvGid","SCAC",0,"el"),N("o5","PlannedShipment/TransportMode","Mode",0,"el"),N("o6","ShipmentStop[]","Stops",0,"loop",{max:"N",kids:["o61","o62","o63","o64","o65"]}),N("o61","StopSequence","Seq #",1,"el"),N("o62","StopType","Type",1,"el"),N("o63","LocationGid","Location",1,"el"),N("o64","Address/City","City",1,"el"),N("o65","EarliestDate","Date",1,"el")],
  },
  csv: {
    _default: "Shipment ID,SCAC,Origin,Dest,Weight,Pieces,Equipment,Pickup Date,Delivery Date,PO#,BOL#,Notes".split(",").map((c,i) => N(`csv${i}`, `Col ${String.fromCharCode(65+i)}`, c, 0, "el")),
  },
};

function getSrc(tx) { return [...ENV, ...(SRC_BODY[tx] || [])]; }
function getTgt(tx, fmt) {
  const s = TGT_SCHEMAS[fmt];
  if (!s) return TGT_SCHEMAS.xml[tx] || [];
  return s[tx] || s._default || [];
}

// ── STATE + REDUCER ──
const init = { maps:[], collapsed:{}, selSrc:null, selMap:null, cust:"(Base)", loopOps:{}, tx:"204", ver:"4010", fmt:"xml", view:"mapping" };

function red(s, a) {
  switch(a.type) {
    case "TOG": return {...s, collapsed:{...s.collapsed,[a.id]:!s.collapsed[a.id]}};
    case "SEL_SRC": return {...s, selSrc:s.selSrc===a.id?null:a.id};
    case "MAP": {
      if(!s.selSrc||s.maps.find(m=>m.tid===a.tid&&!m.co)) return s;
      const nm={id:`m${Date.now()}`,sid:s.selSrc,tid:a.tid,rt:"direct",v:"",co:null,cond:"",ok:false,note:""};
      return {...s,maps:[...s.maps,nm],selSrc:null,selMap:nm.id};
    }
    case "SELM": return {...s,selMap:a.id};
    case "DEL": return {...s,maps:s.maps.filter(m=>m.id!==a.id),selMap:s.selMap===a.id?null:s.selMap};
    case "UPD": return {...s,maps:s.maps.map(m=>m.id===a.id?{...m,...a.u}:m)};
    case "OVR": {
      const b=s.maps.find(m=>m.id===a.bid); if(!b) return s;
      const o={...b,id:`m${Date.now()}`,co:a.c,rt:a.r||"hardcode",v:"",cond:"",ok:false};
      return {...s,maps:[...s.maps,o],selMap:o.id};
    }
    case "CUST": return {...s,cust:a.v};
    case "TX": return {...s,tx:a.v,maps:[],collapsed:{},selSrc:null,selMap:null};
    case "VER": return {...s,ver:a.v};
    case "FMT": return {...s,fmt:a.v,maps:[],collapsed:{},selSrc:null,selMap:null};
    case "VIEW": return {...s,view:a.v};
    case "AUTO": {
      const src=getSrc(s.tx),tgt=getTgt(s.tx,s.fmt),nm=[],used=new Set(s.maps.map(m=>m.tid));
      src.filter(n=>n.type==="el").forEach(sf=>{
        const sw=sf.label.toLowerCase().split(/[\s_\/\-()#*]+/).filter(w=>w.length>2);
        let best=null,bs=0;
        tgt.filter(n=>n.type==="el").forEach(tf=>{
          if(used.has(tf.id))return;
          const tw=tf.label.toLowerCase().split(/[\s_\/\-()#*]+/).filter(w=>w.length>2);
          let h=0;sw.forEach(w=>{if(tw.some(t=>t.includes(w)||w.includes(t)))h++});
          const sc=h/Math.max(sw.length,tw.length,1);
          if(sc>bs&&sc>=0.3){best=tf;bs=sc}
        });
        if(best){used.add(best.id);nm.push({id:`m${Date.now()}_${sf.id}`,sid:sf.id,tid:best.id,rt:"direct",v:"",co:null,cond:"",ok:false,note:""})}
      });
      return {...s,maps:[...s.maps,...nm]};
    }
    default: return s;
  }
}

function isVis(n,tree,col){
  for(const p of tree){if(p.kids?.includes(n.id)&&col[p.id])return false;
    if(p.kids)for(const cid of p.kids){const ch=tree.find(x=>x.id===cid);if(ch?.kids?.includes(n.id)&&col[ch.id])return false;
      if(ch?.kids)for(const gid of ch.kids){const gc=tree.find(x=>x.id===gid);if(gc?.kids?.includes(n.id)&&col[gc.id])return false}}}
  return true;
}

// ── ROW ──
function R({n,side,s,d,tgt}){
  const isEl=n.type==="el",isLp=n.type==="loop",isGr=n.type==="group";
  const bm=isEl?s.maps.find(x=>(side==="s"?x.sid===n.id:x.tid===n.id)&&!x.co):null;
  const ov=isEl?s.maps.filter(x=>(side==="s"?x.sid===n.id:x.tid===n.id)&&x.co):[];
  const mp=!!bm,sel=side==="s"&&s.selSrc===n.id,act=s.selMap&&(bm?.id===s.selMap||ov.some(o=>o.id===s.selMap));
  const ind=n.d*18;
  const bars=[];for(let i=1;i<=n.d;i++)bars.push(<div key={i} style={{position:"absolute",left:i*18-9,top:0,bottom:0,width:1,background:(side==="s"?C.bl:C.pu)+"15"}}/>);
  return(<div>
    <div onClick={()=>{if(n.kids?.length&&!isEl)d({type:"TOG",id:n.id});else if(isEl&&side==="s")d({type:"SEL_SRC",id:n.id});else if(isEl&&side==="t"&&s.selSrc)d({type:"MAP",tid:n.id});if(isEl&&bm)d({type:"SELM",id:bm.id})}} style={{display:"grid",gridTemplateColumns:side==="s"?"minmax(130px,2fr) 1.1fr 0.5fr":"minmax(130px,2fr) 1.1fr",borderBottom:`1px solid ${isLp?C.bHard:C.border}`,background:act?"#fef3c7":sel?C.blS:mp?(bm?.ok?C.gnS:"#fdfcf5"):isLp?C.cream:C.paper,cursor:isEl?"pointer":"default",position:"relative"}}>
      {bars}
      <div style={{padding:`4px 4px 4px ${ind+4}px`,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:3,minWidth:0}}>
        {n.kids?.length&&!isEl?<span onClick={e=>{e.stopPropagation();d({type:"TOG",id:n.id})}} style={{cursor:"pointer",fontSize:8,color:C.t3,width:10,textAlign:"center",flexShrink:0}}>{s.collapsed[n.id]?"▶":"▼"}</span>:isEl?<div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,border:`2px solid ${mp?(bm?.ok?C.gn:C.bl):sel?C.bl:C.border}`,background:mp?(bm?.ok?C.gn:C.bl):"transparent"}}/>:<span style={{width:10}}/>}
        {isLp&&<span style={{fontSize:6,fontWeight:800,padding:"0 2px",borderRadius:2,background:C.amS,color:C.am,fontFamily:C.mono,flexShrink:0,lineHeight:"12px"}}>LP</span>}
        {isGr&&!isLp&&<span style={{fontSize:6,fontWeight:800,padding:"0 2px",borderRadius:2,background:C.blS,color:C.bl,fontFamily:C.mono,flexShrink:0,lineHeight:"12px"}}>G</span>}
        <span style={{fontSize:9.5,fontFamily:C.mono,fontWeight:600,color:isLp?C.am:isGr?C.bl:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.seg}</span>
        {ov.length>0&&<span style={{fontSize:6,fontWeight:800,padding:"0 3px",borderRadius:8,background:C.orS,color:C.or,fontFamily:C.mono,flexShrink:0}}>{ov.length}</span>}
      </div>
      <div style={{padding:"4px",borderRight:side==="s"?`1px solid ${C.border}`:"none",overflow:"hidden"}}><span style={{fontSize:10,color:C.tx,fontWeight:isLp||isGr?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{n.label}</span></div>
      {side==="s"&&<div style={{padding:"4px",overflow:"hidden"}}>{isEl&&<span style={{fontSize:8,fontFamily:C.mono,color:C.t3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>{n.sample}</span>}</div>}
    </div>
    {mp&&side==="s"&&<div onClick={()=>d({type:"SELM",id:bm.id})} style={{paddingLeft:ind+22,padding:`1px 4px 1px ${ind+22}px`,background:act?"#fef3c7":bm.ok?"#eefbf0":"#fffff5",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:8}}>
      <span style={{color:RT[bm.rt]?.c||C.bl}}>{RT[bm.rt]?.i}</span>
      <span style={{fontFamily:C.mono,color:C.pu,fontWeight:600,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tgt.find(t=>t.id===bm.tid)?.seg}</span>
      {bm.v&&<span style={{color:C.t2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>"{bm.v}"</span>}
      {ov.length>0&&<span style={{color:C.or,fontWeight:700,fontSize:7}}>+{ov.length}</span>}
      <span style={{color:bm.ok?C.gn:C.t3,marginLeft:"auto"}}>{bm.ok?"✓":"○"}</span>
    </div>}
  </div>);
}

// ── RULE PANEL ──
function RP({s,d,src,tgt}){
  const sel=s.selMap?s.maps.find(m=>m.id===s.selMap):null;
  if(!sel) return <div style={{padding:12,textAlign:"center",color:C.t3,fontSize:10}}>Click source field → target field to map</div>;
  const sn=src.find(n=>n.id===sel.sid),tn=tgt.find(n=>n.id===sel.tid);
  const bm=s.maps.find(m=>m.sid===sel.sid&&m.tid===sel.tid&&!m.co);
  const ov=s.maps.filter(m=>m.sid===sel.sid&&m.tid===sel.tid&&m.co);
  const [oc,soc]=useState("");const [ot,sot]=useState("hardcode");
  return(<div style={{display:"flex",height:"100%"}}>
    <div style={{flex:1,padding:"6px 10px",overflowY:"auto",borderRight:`1px solid ${C.border}`}}>
      <div style={{fontSize:10,fontWeight:700,marginBottom:3}}>{sn?.seg} <span style={{color:C.bl}}>→</span> {tn?.seg}</div>
      <div style={{fontSize:8,color:C.t3,marginBottom:6}}>{sn?.label} → {tn?.label}</div>
      <div style={{background:C.blS,border:`1px solid ${C.bl}22`,borderRadius:4,padding:6,marginBottom:4}}>
        <div style={{fontSize:7,fontWeight:700,color:C.bl,marginBottom:4,textTransform:"uppercase"}}>Base Rule</div>
        <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:3}}>
          <select value={bm?.rt||"direct"} onChange={e=>bm&&d({type:"UPD",id:bm.id,u:{rt:e.target.value}})} style={{padding:"1px 3px",borderRadius:3,border:`1px solid ${C.border}`,fontSize:8,background:C.white,cursor:"pointer"}}>
            {Object.entries(RT).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}
          </select>
          {bm&&!["direct","suppress","currentDate","currentTime","passthrough"].includes(bm.rt)&&<input value={bm.v||""} onChange={e=>d({type:"UPD",id:bm.id,u:{v:e.target.value}})} placeholder="Value..." style={{flex:1,padding:"1px 4px",borderRadius:3,border:`1px solid ${C.border}`,fontSize:8,fontFamily:C.mono,outline:"none",background:C.white}}/>}
        </div>
        {bm&&<div style={{display:"flex",gap:2}}><button onClick={()=>d({type:"UPD",id:bm.id,u:{ok:!bm.ok}})} style={{padding:"1px 5px",borderRadius:3,fontSize:7,fontWeight:600,cursor:"pointer",border:`1px solid ${bm.ok?C.gnB:C.border}`,background:bm.ok?C.gnS:C.white,color:bm.ok?C.gn:C.bl,fontFamily:C.font}}>{bm.ok?"✓ Done":"Confirm"}</button><button onClick={()=>d({type:"DEL",id:bm.id})} style={{padding:"1px 4px",borderRadius:3,fontSize:7,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.rd,fontFamily:C.font}}>Del</button></div>}
      </div>
      <div style={{fontSize:7,fontWeight:700,color:C.or,marginBottom:3,textTransform:"uppercase"}}>Overrides ({ov.length})</div>
      {ov.map(o=><div key={o.id} onClick={()=>d({type:"SELM",id:o.id})} style={{background:s.selMap===o.id?"#fef3c7":C.orS,border:`1px solid ${C.or}22`,borderRadius:4,padding:5,marginBottom:2,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:8,fontWeight:700,color:C.or}}>{o.co}</span><button onClick={e=>{e.stopPropagation();d({type:"DEL",id:o.id})}} style={{background:"none",border:"none",cursor:"pointer",fontSize:7,color:C.rd}}>✕</button></div>
        <div style={{display:"flex",gap:2,alignItems:"center"}}>
          <select value={o.rt} onChange={e=>d({type:"UPD",id:o.id,u:{rt:e.target.value}})} style={{padding:"1px 2px",borderRadius:2,border:`1px solid ${C.border}`,fontSize:7,background:C.white,cursor:"pointer"}}>{Object.entries(RT).map(([k,v])=><option key={k} value={k}>{v.i} {v.l}</option>)}</select>
          {!["direct","suppress","currentDate","currentTime","passthrough"].includes(o.rt)&&<input value={o.v||""} onChange={e=>d({type:"UPD",id:o.id,u:{v:e.target.value}})} onClick={e=>e.stopPropagation()} placeholder="Val..." style={{flex:1,padding:"1px 3px",borderRadius:2,border:`1px solid ${C.border}`,fontSize:7,fontFamily:C.mono,outline:"none",background:C.white}}/>}
        </div>
        <input value={o.cond||""} onChange={e=>d({type:"UPD",id:o.id,u:{cond:e.target.value}})} onClick={e=>e.stopPropagation()} placeholder="If ISA*06 = ..." style={{width:"100%",padding:"1px 3px",borderRadius:2,border:`1px solid ${C.border}`,fontSize:7,outline:"none",background:C.white,marginTop:2,boxSizing:"border-box"}}/>
      </div>)}
      {bm&&<div style={{display:"flex",gap:2,marginTop:3}}>
        <select value={oc} onChange={e=>soc(e.target.value)} style={{flex:1,padding:"1px 2px",borderRadius:3,border:`1px solid ${C.border}`,fontSize:7,background:C.white,cursor:"pointer"}}><option value="">Customer...</option>{CUSTS.filter(c=>c!=="(Base)").map(c=><option key={c} value={c}>{c}</option>)}</select>
        <button onClick={()=>{if(oc){d({type:"OVR",bid:bm.id,c:oc,r:ot});soc("")}}} disabled={!oc} style={{padding:"1px 5px",borderRadius:3,border:"none",cursor:oc?"pointer":"default",background:oc?C.or:C.border,color:"#fff",fontSize:7,fontWeight:700,opacity:oc?1:0.5}}>+OVR</button>
      </div>}
    </div>
    <div style={{width:160,padding:"6px 8px",background:C.cream,overflowY:"auto"}}>
      <div style={{fontSize:7,fontWeight:700,color:C.t3,marginBottom:3,textTransform:"uppercase"}}>Notes</div>
      <textarea value={sel.note||""} onChange={e=>d({type:"UPD",id:sel.id,u:{note:e.target.value}})} placeholder="Notes..." style={{width:"100%",height:40,padding:3,borderRadius:3,border:`1px solid ${C.border}`,fontSize:7,fontFamily:C.font,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
      <div style={{fontSize:7,fontWeight:700,color:C.t3,marginTop:6,marginBottom:2,textTransform:"uppercase"}}>Sample</div>
      <div style={{fontSize:7,fontFamily:C.mono,color:C.tx,background:C.white,padding:3,borderRadius:3,border:`1px solid ${C.border}`,wordBreak:"break-all"}}>{sn?.sample||"—"}</div>
      <div style={{fontSize:7,fontWeight:700,color:C.t3,marginTop:6,marginBottom:2,textTransform:"uppercase"}}>Summary</div>
      <div style={{fontSize:7,lineHeight:1.4}}><div><b>Base:</b> {RT[bm?.rt]?.l} {bm?.v&&`"${bm.v}"`}</div>{ov.map(o=><div key={o.id} style={{color:C.or}}><b>{o.co.split(" ")[0]}:</b> {RT[o.rt]?.l} {o.v&&`"${o.v}"`}</div>)}</div>
    </div>
  </div>);
}

// ── MAIN ──
export default function App(){
  const [s,d]=useReducer(red,init);
  const src=useMemo(()=>getSrc(s.tx),[s.tx]);
  const tgt=useMemo(()=>getTgt(s.tx,s.fmt),[s.tx,s.fmt]);
  const vs=src.filter(n=>isVis(n,src,s.collapsed));
  const vt=tgt.filter(n=>isVis(n,tgt,s.collapsed));
  const bms=s.maps.filter(m=>!m.co);
  const st={t:bms.length,ok:bms.filter(m=>m.ok).length,ov:s.maps.filter(m=>m.co).length};

  return(<div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.bg,fontFamily:C.font,color:C.tx}}>
    <link href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700;800&family=Fira+Code:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>{`*{box-sizing:border-box;margin:0}input::placeholder,textarea::placeholder{color:${C.t3}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.bHard};border-radius:2px}`}</style>
    <div style={{background:C.paper,borderBottom:`1px solid ${C.bHard}`,padding:"4px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,flexWrap:"wrap",gap:3}}>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <div style={{width:6,height:6,borderRadius:1.5,background:C.bl,transform:"rotate(45deg)"}}/>
        <span style={{fontSize:12,fontWeight:800}}>IntegrateOS</span>
        <select value={s.tx} onChange={e=>d({type:"TX",v:e.target.value})} style={{padding:"2px 4px",borderRadius:3,border:`1px solid ${C.bl}44`,fontSize:9,fontWeight:700,background:C.blS,cursor:"pointer",color:C.bl,fontFamily:C.font}}>
          <optgroup label="Tendering"><option value="204">204 Load Tender</option><option value="990">990 Response</option></optgroup>
          <optgroup label="Status"><option value="214">214 Shipment Status</option></optgroup>
          <optgroup label="Billing"><option value="210">210 Freight Invoice</option></optgroup>
          <optgroup label="Orders"><option value="850">850 Purchase Order</option><option value="855">855 PO Ack</option><option value="810">810 Invoice</option></optgroup>
          <optgroup label="Shipping"><option value="856">856 ASN</option></optgroup>
        </select>
        <select value={s.ver} onChange={e=>d({type:"VER",v:e.target.value})} style={{padding:"2px 3px",borderRadius:3,border:`1px solid ${C.border}`,fontSize:8,background:C.white,cursor:"pointer",fontFamily:C.mono}}>
          {["3040","4010","4030","5010"].map(v=><option key={v} value={v}>X12 {v}</option>)}
        </select>
        <select value={s.fmt} onChange={e=>d({type:"FMT",v:e.target.value})} style={{padding:"2px 3px",borderRadius:3,border:`1px solid ${C.pu}44`,fontSize:8,fontWeight:600,background:C.puS,cursor:"pointer",color:C.pu,fontFamily:C.font}}>
          {Object.entries(FMT_LABELS).map(([k,v])=><option key={k} value={k}>→ {v}</option>)}
        </select>
      </div>
      <div style={{display:"flex",gap:3,alignItems:"center"}}>
        <select value={s.cust} onChange={e=>d({type:"CUST",v:e.target.value})} style={{padding:"1px 3px",borderRadius:3,border:`1px solid ${C.border}`,fontSize:7,background:C.white,cursor:"pointer"}}>{CUSTS.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <span style={{fontSize:7,fontFamily:C.mono,color:C.t3}}>{st.ok}/{st.t} · {st.ov}ovr</span>
        <button onClick={()=>d({type:"AUTO"})} style={{padding:"2px 7px",borderRadius:3,border:`1px solid ${C.bl}33`,background:C.blS,cursor:"pointer",fontSize:8,fontWeight:700,color:C.bl,fontFamily:C.font}}>🤖 Auto</button>
      </div>
    </div>
    <div style={{display:"flex",flex:1,minHeight:0}}>
      <div style={{flex:1,borderRight:`2px solid ${C.bHard}`,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{padding:"3px 5px",background:C.cream,borderBottom:`1px solid ${C.bHard}`,display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <span style={{fontSize:7,fontWeight:800,padding:"0 3px",borderRadius:2,background:C.blS,color:C.bl,fontFamily:C.mono}}>X12 {s.ver}</span>
          <span style={{fontSize:9,fontWeight:700}}>{TX_LABELS[s.tx]}</span>
          <span style={{fontSize:7,color:C.t3,marginLeft:"auto"}}>{src.filter(n=>n.type==="el").length} fld</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(130px,2fr) 1.1fr 0.5fr",background:C.cream,borderBottom:`1px solid ${C.bHard}`,fontSize:7,fontWeight:700,color:C.t3,textTransform:"uppercase",flexShrink:0}}>
          <div style={{padding:"2px 4px",borderRight:`1px solid ${C.border}`}}>Segment</div>
          <div style={{padding:"2px 4px",borderRight:`1px solid ${C.border}`}}>Description</div>
          <div style={{padding:"2px 4px"}}>Sample</div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>{vs.map(n=><R key={n.id} n={n} side="s" s={s} d={d} tgt={tgt}/>)}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{padding:"3px 5px",background:C.cream,borderBottom:`1px solid ${C.bHard}`,display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          <span style={{fontSize:7,fontWeight:800,padding:"0 3px",borderRadius:2,background:C.puS,color:C.pu,fontFamily:C.mono}}>{s.fmt==="json"?"{}":s.fmt==="csv"?"CSV":"XML"}</span>
          <span style={{fontSize:9,fontWeight:700}}>{FMT_LABELS[s.fmt]}</span>
          <span style={{fontSize:7,color:C.t3,marginLeft:"auto"}}>{tgt.filter(n=>n.type==="el").length} fld</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(130px,2fr) 1.1fr",background:C.cream,borderBottom:`1px solid ${C.bHard}`,fontSize:7,fontWeight:700,color:C.t3,textTransform:"uppercase",flexShrink:0}}>
          <div style={{padding:"2px 4px",borderRight:`1px solid ${C.border}`}}>Field / Path</div>
          <div style={{padding:"2px 4px"}}>Description</div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>{vt.map(n=><R key={n.id} n={n} side="t" s={s} d={d} tgt={tgt}/>)}</div>
      </div>
    </div>
    <div style={{height:180,borderTop:`2px solid ${C.bHard}`,background:C.paper,flexShrink:0,overflow:"hidden"}}>
      <div style={{padding:"3px 8px",borderBottom:`1px solid ${C.border}`,background:C.cream,fontSize:8,fontWeight:700}}>📐 Rule Detail</div>
      <div style={{height:"calc(100% - 22px)"}}><RP s={s} d={d} src={src} tgt={tgt}/></div>
    </div>
  </div>);
}
