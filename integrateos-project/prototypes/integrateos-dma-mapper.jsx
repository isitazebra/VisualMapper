import { useState, useReducer, useCallback } from "react";

const C = {
  bg: "#f3f1ec", paper: "#faf8f5", white: "#fff", cream: "#edeae3",
  border: "#dbd6cb", bHard: "#c2bdb0", focus: "#1d4ed8",
  tx: "#1b1914", t2: "#5a554b", t3: "#999189",
  bl: "#1d4ed8", blS: "#eef2ff",
  gn: "#15803d", gnS: "#f0fdf4", gnB: "#86efac",
  am: "#a16207", amS: "#fefce8",
  rd: "#be123c", rdS: "#fff1f2",
  pu: "#7c3aed", puS: "#f5f3ff",
  tl: "#0f766e", tlS: "#f0fdf9",
  or: "#c2410c", orS: "#fff7ed",
  pk: "#be185d",
  font: "'Karla', sans-serif",
  mono: "'Fira Code', monospace",
};

// Rule type definitions
const RULE_TYPES = {
  direct: { label: "Direct Map", icon: "→", color: C.bl },
  hardcode: { label: "Hardcode", icon: "✎", color: C.pu },
  conditional: { label: "Conditional", icon: "⚡", color: C.or },
  suppress: { label: "Do Not Send", icon: "⊘", color: C.rd },
  currentDate: { label: "Current Date", icon: "📅", color: C.tl },
  currentTime: { label: "Current Time", icon: "⏰", color: C.tl },
  autoIncrement: { label: "Auto Increment", icon: "#", color: C.am },
  concat: { label: "Concatenate", icon: "&", color: C.pk },
  lookup: { label: "Lookup/Code Convert", icon: "📋", color: C.gn },
  formula: { label: "Formula/Transform", icon: "ƒ", color: C.bl },
  parseXml: { label: "Parse from XML/Tag", icon: "🔍", color: "#6366f1" },
  dateFormat: { label: "Date Format Convert", icon: "🔄", color: C.tl },
  hlCounter: { label: "HL Counter", icon: "⇅", color: C.am },
  splitField: { label: "Split/Substring", icon: "✂", color: C.pk },
  conditionalCreate: { label: "Conditional Create", icon: "➕", color: C.or },
  passthrough: { label: "Passthrough", icon: "⇢", color: C.gn },
};

// ── SOURCE TREE: X12 204 Load Tender (4010) ──
const SRC = [
  { id: "isa", seg: "ISA", label: "Interchange Control Header", d: 0, type: "group", kids: ["isa01","isa02","isa03","isa04","isa05","isa06","isa07","isa08","isa09","isa10","isa11","isa12","isa13","isa14","isa15","isa16"] },
  { id: "isa01", seg: "ISA*01", label: "Authorization Info Qualifier", d: 1, type: "el", sample: "00" },
  { id: "isa02", seg: "ISA*02", label: "Authorization Information", d: 1, type: "el", sample: "          " },
  { id: "isa03", seg: "ISA*03", label: "Security Info Qualifier", d: 1, type: "el", sample: "00" },
  { id: "isa04", seg: "ISA*04", label: "Security Information", d: 1, type: "el", sample: "          " },
  { id: "isa05", seg: "ISA*05", label: "Interchange ID Qualifier (Sender)", d: 1, type: "el", sample: "ZZ" },
  { id: "isa06", seg: "ISA*06", label: "Interchange Sender ID", d: 1, type: "el", sample: "UPSSCNL" },
  { id: "isa07", seg: "ISA*07", label: "Interchange ID Qualifier (Receiver)", d: 1, type: "el", sample: "02" },
  { id: "isa08", seg: "ISA*08", label: "Interchange Receiver ID", d: 1, type: "el", sample: "CLLQ" },
  { id: "isa09", seg: "ISA*09", label: "Interchange Date", d: 1, type: "el", sample: "20250318" },
  { id: "isa10", seg: "ISA*10", label: "Interchange Time", d: 1, type: "el", sample: "1430" },
  { id: "isa11", seg: "ISA*11", label: "Repetition Separator", d: 1, type: "el", sample: "U" },
  { id: "isa12", seg: "ISA*12", label: "Interchange Control Version", d: 1, type: "el", sample: "00401" },
  { id: "isa13", seg: "ISA*13", label: "Interchange Control Number", d: 1, type: "el", sample: "000017090" },
  { id: "isa14", seg: "ISA*14", label: "Acknowledgment Requested", d: 1, type: "el", sample: "0" },
  { id: "isa15", seg: "ISA*15", label: "Interchange Usage Indicator", d: 1, type: "el", sample: "P" },
  { id: "isa16", seg: "ISA*16", label: "Component Element Separator", d: 1, type: "el", sample: '"' },

  { id: "gs", seg: "GS", label: "Functional Group Header", d: 0, type: "group", kids: ["gs01","gs02","gs03","gs04","gs05","gs06","gs07","gs08"] },
  { id: "gs01", seg: "GS*01", label: "Functional Identifier Code", d: 1, type: "el", sample: "SM" },
  { id: "gs02", seg: "GS*02", label: "Application Sender's Code", d: 1, type: "el", sample: "UPSSCNL" },
  { id: "gs03", seg: "GS*03", label: "Application Receiver's Code", d: 1, type: "el", sample: "CLLQ" },
  { id: "gs04", seg: "GS*04", label: "Date", d: 1, type: "el", sample: "20250318" },
  { id: "gs05", seg: "GS*05", label: "Time", d: 1, type: "el", sample: "143000" },
  { id: "gs06", seg: "GS*06", label: "Group Control Number", d: 1, type: "el", sample: "1709" },
  { id: "gs07", seg: "GS*07", label: "Responsible Agency Code", d: 1, type: "el", sample: "X" },
  { id: "gs08", seg: "GS*08", label: "Version / Release Code", d: 1, type: "el", sample: "004010" },

  { id: "st", seg: "ST", label: "Transaction Set Header", d: 0, type: "group", kids: ["st01","st02"] },
  { id: "st01", seg: "ST*01", label: "Transaction Set ID Code", d: 1, type: "el", sample: "204" },
  { id: "st02", seg: "ST*02", label: "Transaction Set Control #", d: 1, type: "el", sample: "017090001" },

  { id: "b2", seg: "B2", label: "Beginning Segment for Shipment", d: 0, type: "group", kids: ["b201","b202","b203","b204","b205","b206"] },
  { id: "b201", seg: "B2*01", label: "Tariff Service Code", d: 1, type: "el", sample: "" },
  { id: "b202", seg: "B2*02", label: "Standard Carrier Alpha Code", d: 1, type: "el", sample: "CLNL" },
  { id: "b203", seg: "B2*03", label: "Standard Point Location Code", d: 1, type: "el", sample: "" },
  { id: "b204", seg: "B2*04", label: "Shipment ID Number", d: 1, type: "el", sample: "LD23029450" },
  { id: "b205", seg: "B2*05", label: "Weight Unit Code", d: 1, type: "el", sample: "" },
  { id: "b206", seg: "B2*06", label: "Shipment Method of Payment", d: 1, type: "el", sample: "PP" },

  { id: "b2a", seg: "B2A", label: "Set Purpose", d: 0, type: "group", kids: ["b2a01","b2a02"] },
  { id: "b2a01", seg: "B2A*01", label: "Transaction Set Purpose Code", d: 1, type: "el", sample: "00", note: "00=Original, 04=Update, 01=Cancel" },
  { id: "b2a02", seg: "B2A*02", label: "Application Type", d: 1, type: "el", sample: "LT", note: "LT=Load Tender" },

  { id: "l11_hdr", seg: "L11 (Header)", label: "Header Reference Numbers", d: 0, type: "loop", max: "99", kids: ["l11_01","l11_02","l11_03"] },
  { id: "l11_01", seg: "L11*01", label: "Reference Identification", d: 1, type: "el", sample: "LD23029450" },
  { id: "l11_02", seg: "L11*02", label: "Reference ID Qualifier", d: 1, type: "el", sample: "BM", note: "BM=BOL, CR=Cust Ref, QN=Stop#, IT=Internal, MO=Mode" },
  { id: "l11_03", seg: "L11*03", label: "Description", d: 1, type: "el", sample: "LOAD ID" },

  { id: "nte", seg: "NTE", label: "Note/Special Instruction", d: 0, type: "loop", max: "10", kids: ["nte01","nte02"] },
  { id: "nte01", seg: "NTE*01", label: "Note Reference Code", d: 1, type: "el", sample: "" },
  { id: "nte02", seg: "NTE*02", label: "Note Text (Free Form)", d: 1, type: "el", sample: "CONTACT INFORMATION CHRISTEL" },

  { id: "n7", seg: "N7", label: "Equipment Details", d: 0, type: "group", kids: ["n701","n702","n711"] },
  { id: "n701", seg: "N7*01", label: "Equipment Initial", d: 1, type: "el", sample: "" },
  { id: "n702", seg: "N7*02", label: "Equipment Number", d: 1, type: "el", sample: "0" },
  { id: "n711", seg: "N7*11", label: "Equipment Description Code", d: 1, type: "el", sample: "BT", note: "TL=Trailer, BT=Box Trailer, CN=Container" },

  { id: "n1_loop", seg: "N1 Loop", label: "Party Identification (repeating)", d: 0, type: "loop", max: "5", kids: ["n1_01","n1_02","n1_03","n1_04","n3_01","n4_01","n4_02","n4_03","n4_04"] },
  { id: "n1_01", seg: "N1*01", label: "Entity Identifier Code", d: 1, type: "el", sample: "BT", note: "SH=Ship From, CN=Consignee, BT=Bill To, SF=Ship From" },
  { id: "n1_02", seg: "N1*02", label: "Name", d: 1, type: "el", sample: "UPS SCS (NEDERLAND) BV" },
  { id: "n1_03", seg: "N1*03", label: "ID Code Qualifier", d: 1, type: "el", sample: "93" },
  { id: "n1_04", seg: "N1*04", label: "Identification Code", d: 1, type: "el", sample: "UPSSCSNL" },
  { id: "n3_01", seg: "N3*01", label: "Address Line", d: 1, type: "el", sample: "LUCHTHAVENWEG 57" },
  { id: "n4_01", seg: "N4*01", label: "City Name", d: 1, type: "el", sample: "EINDHOVEN" },
  { id: "n4_02", seg: "N4*02", label: "State/Province Code", d: 1, type: "el", sample: "NB" },
  { id: "n4_03", seg: "N4*03", label: "Postal Code", d: 1, type: "el", sample: "5657 EA" },
  { id: "n4_04", seg: "N4*04", label: "Country Code", d: 1, type: "el", sample: "NL" },

  { id: "s5_loop", seg: "S5 Loop", label: "Stop-Off Details (repeating)", d: 0, type: "loop", max: "999", kids: ["s5_01","s5_02","s5_l11","s5_l11_01","s5_l11_02","s5_g62","s5_g62_01","s5_g62_02","s5_g62_03","s5_g62_04","s5_at8","s5_at8_01","s5_at8_02","s5_at8_03","s5_at8_05","s5_n1s","s5_n1_01","s5_n1_02","s5_n3_01","s5_n4_01","s5_n4_02","s5_n4_03","s5_n4_04","s5_at5","s5_at5_01","s5_at5_02"] },
  { id: "s5_01", seg: "S5*01", label: "Stop Sequence Number", d: 1, type: "el", sample: "1" },
  { id: "s5_02", seg: "S5*02", label: "Stop Reason Code", d: 1, type: "el", sample: "CL", note: "CL=Pickup, CU=Delivery" },

  { id: "s5_l11", seg: "L11 (Stop)", label: "Stop Reference Numbers", d: 1, type: "loop", max: "99", nested: true, kids: ["s5_l11_01","s5_l11_02"] },
  { id: "s5_l11_01", seg: "L11*01 (Stop)", label: "Stop Reference ID", d: 2, type: "el", sample: "EUNLDELL01" },
  { id: "s5_l11_02", seg: "L11*02 (Stop)", label: "Stop Reference Qualifier", d: 2, type: "el", sample: "11", note: "11=Acct#, DD=Doc#, Q1=Stop Ref" },

  { id: "s5_g62", seg: "G62 (Stop)", label: "Date/Time (at stop)", d: 1, type: "group", kids: ["s5_g62_01","s5_g62_02","s5_g62_03","s5_g62_04"] },
  { id: "s5_g62_01", seg: "G62*01", label: "Date Qualifier", d: 2, type: "el", sample: "37", note: "37=Ship, 38=Delivery, 10=Requested" },
  { id: "s5_g62_02", seg: "G62*02", label: "Date (YYYYMMDD)", d: 2, type: "el", sample: "20250825" },
  { id: "s5_g62_03", seg: "G62*03", label: "Time Qualifier", d: 2, type: "el", sample: "I", note: "I=From, K=To" },
  { id: "s5_g62_04", seg: "G62*04", label: "Time (HHMMSS)", d: 2, type: "el", sample: "130000" },

  { id: "s5_at8", seg: "AT8 (Stop)", label: "Shipment Weight/Packaging", d: 1, type: "group", kids: ["s5_at8_01","s5_at8_02","s5_at8_03","s5_at8_05"] },
  { id: "s5_at8_01", seg: "AT8*01", label: "Weight Qualifier", d: 2, type: "el", sample: "G", note: "G=Gross" },
  { id: "s5_at8_02", seg: "AT8*02", label: "Weight Unit Code", d: 2, type: "el", sample: "K", note: "K=KG, L=LB" },
  { id: "s5_at8_03", seg: "AT8*03", label: "Weight", d: 2, type: "el", sample: "1" },
  { id: "s5_at8_05", seg: "AT8*05", label: "Lading Quantity", d: 2, type: "el", sample: "33" },

  { id: "s5_n1s", seg: "N1 (Stop)", label: "Stop Party Details", d: 1, type: "loop", max: "3", nested: true, kids: ["s5_n1_01","s5_n1_02","s5_n3_01","s5_n4_01","s5_n4_02","s5_n4_03","s5_n4_04"] },
  { id: "s5_n1_01", seg: "N1*01 (Stop)", label: "Stop Entity Code", d: 2, type: "el", sample: "SH" },
  { id: "s5_n1_02", seg: "N1*02 (Stop)", label: "Stop Party Name", d: 2, type: "el", sample: "DELL TECHNOLOGIES" },
  { id: "s5_n3_01", seg: "N3*01 (Stop)", label: "Stop Address", d: 2, type: "el", sample: "100 DELL WAY" },
  { id: "s5_n4_01", seg: "N4*01 (Stop)", label: "Stop City", d: 2, type: "el", sample: "ROUND ROCK" },
  { id: "s5_n4_02", seg: "N4*02 (Stop)", label: "Stop State", d: 2, type: "el", sample: "TX" },
  { id: "s5_n4_03", seg: "N4*03 (Stop)", label: "Stop Zip", d: 2, type: "el", sample: "78682" },
  { id: "s5_n4_04", seg: "N4*04 (Stop)", label: "Stop Country", d: 2, type: "el", sample: "US" },

  { id: "s5_at5", seg: "AT5 (Stop)", label: "Hazmat / Special Handling", d: 1, type: "group", kids: ["s5_at5_01","s5_at5_02"] },
  { id: "s5_at5_01", seg: "AT5*01", label: "Special Handling Code", d: 2, type: "el", sample: "HVHR" },
  { id: "s5_at5_02", seg: "AT5*02", label: "Special Handling Description", d: 2, type: "el", sample: "BOX" },

  { id: "l3", seg: "L3", label: "Total Weight and Charges", d: 0, type: "group", kids: ["l3_01","l3_03","l3_05","l3_11","l3_12"] },
  { id: "l3_01", seg: "L3*01", label: "Weight", d: 1, type: "el", sample: "42500" },
  { id: "l3_03", seg: "L3*03", label: "Freight Rate", d: 1, type: "el", sample: "1250.00" },
  { id: "l3_05", seg: "L3*05", label: "Total Charges", d: 1, type: "el", sample: "1250.00" },
  { id: "l3_11", seg: "L3*11", label: "Weight Unit Code", d: 1, type: "el", sample: "K" },
  { id: "l3_12", seg: "L3*12", label: "Lading Quantity", d: 1, type: "el", sample: "33" },
];

// ── TARGET TREE: Internal IO/FO XML (Coyote/RXO canonical) ──
const TGT = [
  { id: "t_isa", seg: "/EDI204V5010/ISA", label: "ISA Envelope", d: 0, type: "group", kids: ["t_isa01","t_isa02","t_isa03","t_isa04","t_isa05","t_isa06","t_isa07","t_isa08","t_isa09","t_isa10","t_isa11","t_isa12","t_isa13","t_isa14","t_isa15","t_isa16"] },
  { id: "t_isa01", seg: "authorizationInformationQualifier", label: "Auth Info Qualifier", d: 1, type: "el" },
  { id: "t_isa02", seg: "authorizationInformation", label: "Auth Information", d: 1, type: "el" },
  { id: "t_isa03", seg: "securityInformationQualifier", label: "Security Info Qualifier", d: 1, type: "el" },
  { id: "t_isa04", seg: "securityInformation", label: "Security Information", d: 1, type: "el" },
  { id: "t_isa05", seg: "interchangeIDQualifier", label: "Interchange ID Qualifier", d: 1, type: "el" },
  { id: "t_isa06", seg: "interchangeSenderID", label: "Interchange Sender ID", d: 1, type: "el" },
  { id: "t_isa07", seg: "interchangeIDQualifier2", label: "Interchange ID Qualifier 2", d: 1, type: "el" },
  { id: "t_isa08", seg: "interchangeReceiverID", label: "Interchange Receiver ID", d: 1, type: "el" },
  { id: "t_isa09", seg: "interchangeDate", label: "Interchange Date", d: 1, type: "el" },
  { id: "t_isa10", seg: "interchangeTime", label: "Interchange Time", d: 1, type: "el" },
  { id: "t_isa11", seg: "repetitionSeparator", label: "Repetition Separator", d: 1, type: "el" },
  { id: "t_isa12", seg: "interchangeControlVersionNumber", label: "Control Version Number", d: 1, type: "el" },
  { id: "t_isa13", seg: "interchangeControlNumber", label: "Control Number", d: 1, type: "el" },
  { id: "t_isa14", seg: "acknowledgmentRequested", label: "Acknowledgment Requested", d: 1, type: "el" },
  { id: "t_isa15", seg: "interchangeUsageIndicator", label: "Usage Indicator", d: 1, type: "el" },
  { id: "t_isa16", seg: "componentElementSeparator", label: "Component Separator", d: 1, type: "el" },

  { id: "t_gs", seg: "/EDI204V5010/ISA/GS", label: "GS Functional Group", d: 0, type: "group", kids: ["t_gs01","t_gs02","t_gs03","t_gs04","t_gs05","t_gs06","t_gs07","t_gs08"] },
  { id: "t_gs01", seg: "functionalIdentifierCode", label: "Functional ID Code", d: 1, type: "el" },
  { id: "t_gs02", seg: "applicationSendersCode", label: "Application Sender Code", d: 1, type: "el" },
  { id: "t_gs03", seg: "applicationReceiversCode", label: "Application Receiver Code", d: 1, type: "el" },
  { id: "t_gs04", seg: "date", label: "Date", d: 1, type: "el" },
  { id: "t_gs05", seg: "time", label: "Time", d: 1, type: "el" },
  { id: "t_gs06", seg: "groupControlNumber", label: "Group Control Number", d: 1, type: "el" },
  { id: "t_gs07", seg: "responsibleAgencyCode", label: "Responsible Agency Code", d: 1, type: "el" },
  { id: "t_gs08", seg: "versionReleaseCode", label: "Version/Release Code", d: 1, type: "el" },

  { id: "t_b2", seg: "/EDI204V5010/.../B2", label: "B2 Shipment", d: 0, type: "group", kids: ["t_b2_scac","t_b2_shipid","t_b2_pay"] },
  { id: "t_b2_scac", seg: "standardCarrierAlphaCode", label: "SCAC Code", d: 1, type: "el" },
  { id: "t_b2_shipid", seg: "shipmentIdentificationNumber", label: "Shipment ID Number", d: 1, type: "el" },
  { id: "t_b2_pay", seg: "shipmentMethodOfPayment", label: "Shipment Method of Payment", d: 1, type: "el" },

  { id: "t_b2a", seg: "/EDI204V5010/.../B2A", label: "B2A Purpose", d: 0, type: "group", kids: ["t_b2a_purpose","t_b2a_type"] },
  { id: "t_b2a_purpose", seg: "transactionSetPurposeCode", label: "Purpose Code", d: 1, type: "el" },
  { id: "t_b2a_type", seg: "applicationType", label: "Application Type", d: 1, type: "el" },

  { id: "t_l11", seg: "L11_list/L11 (Header)", label: "Header References (repeating)", d: 0, type: "loop", max: "99", kids: ["t_l11_ref","t_l11_qual","t_l11_desc"] },
  { id: "t_l11_ref", seg: "referenceIdentification", label: "Reference ID", d: 1, type: "el" },
  { id: "t_l11_qual", seg: "referenceIdentificationQualifier", label: "Reference Qualifier", d: 1, type: "el" },
  { id: "t_l11_desc", seg: "description", label: "Description", d: 1, type: "el" },

  { id: "t_nte", seg: "NTE_list/NTE", label: "Notes (repeating)", d: 0, type: "loop", max: "10", kids: ["t_nte_code","t_nte_text"] },
  { id: "t_nte_code", seg: "noteReferenceCode", label: "Note Reference Code", d: 1, type: "el" },
  { id: "t_nte_text", seg: "freeFormMessage", label: "Note Text", d: 1, type: "el" },

  { id: "t_n7", seg: "N7", label: "Equipment", d: 0, type: "group", kids: ["t_n7_num","t_n7_desc"] },
  { id: "t_n7_num", seg: "equipmentNumber", label: "Equipment Number", d: 1, type: "el" },
  { id: "t_n7_desc", seg: "equipmentDescriptionCode", label: "Equipment Type Code", d: 1, type: "el" },

  { id: "t_n1", seg: "Loop0100/N1 (Party)", label: "Party Loop (repeating)", d: 0, type: "loop", max: "5", kids: ["t_n1_ent","t_n1_name","t_n1_idq","t_n1_id","t_n3_addr","t_n4_city","t_n4_state","t_n4_zip","t_n4_country"] },
  { id: "t_n1_ent", seg: "entityIdentifierCode", label: "Entity Identifier Code", d: 1, type: "el" },
  { id: "t_n1_name", seg: "name", label: "Party Name", d: 1, type: "el" },
  { id: "t_n1_idq", seg: "identificationCodeQualifier", label: "ID Code Qualifier", d: 1, type: "el" },
  { id: "t_n1_id", seg: "identificationCode", label: "Identification Code", d: 1, type: "el" },
  { id: "t_n3_addr", seg: "addressInformation", label: "Address Line", d: 1, type: "el" },
  { id: "t_n4_city", seg: "cityName", label: "City", d: 1, type: "el" },
  { id: "t_n4_state", seg: "stateOrProvinceCode", label: "State/Province", d: 1, type: "el" },
  { id: "t_n4_zip", seg: "postalCode", label: "Postal Code", d: 1, type: "el" },
  { id: "t_n4_country", seg: "countryCode", label: "Country Code", d: 1, type: "el" },

  { id: "t_s5", seg: "Loop0300/S5 (Stop)", label: "Stop Loop (repeating)", d: 0, type: "loop", max: "999", kids: ["t_s5_seq","t_s5_reason","t_s5_l11","t_s5_l11r","t_s5_l11q","t_s5_g62d","t_s5_g62t","t_s5_wt","t_s5_wtunit","t_s5_lading","t_s5_n1ent","t_s5_n1name","t_s5_n3","t_s5_n4c","t_s5_n4s","t_s5_n4z","t_s5_n4co","t_s5_at5","t_s5_at5d"] },
  { id: "t_s5_seq", seg: "stopSequenceNumber", label: "Stop Sequence", d: 1, type: "el" },
  { id: "t_s5_reason", seg: "stopReasonCode", label: "Stop Reason Code", d: 1, type: "el" },
  { id: "t_s5_l11", seg: "Loop0310/L11_list", label: "Stop References", d: 1, type: "loop", max: "99", nested: true, kids: ["t_s5_l11r","t_s5_l11q"] },
  { id: "t_s5_l11r", seg: "referenceIdentification", label: "Stop Ref ID", d: 2, type: "el" },
  { id: "t_s5_l11q", seg: "referenceIdentificationQualifier", label: "Stop Ref Qualifier", d: 2, type: "el" },
  { id: "t_s5_g62d", seg: "Loop0310/G62/date", label: "Stop Date", d: 1, type: "el" },
  { id: "t_s5_g62t", seg: "Loop0310/G62/time", label: "Stop Time", d: 1, type: "el" },
  { id: "t_s5_wt", seg: "Loop0320/AT8/weight", label: "Weight", d: 1, type: "el" },
  { id: "t_s5_wtunit", seg: "Loop0320/AT8/weightUnitCode", label: "Weight Unit", d: 1, type: "el" },
  { id: "t_s5_lading", seg: "Loop0320/AT8/ladingQuantity", label: "Lading Quantity", d: 1, type: "el" },
  { id: "t_s5_n1ent", seg: "Loop0310/N1/entityIdentifierCode", label: "Stop Entity Code", d: 1, type: "el" },
  { id: "t_s5_n1name", seg: "Loop0310/N1/name", label: "Stop Party Name", d: 1, type: "el" },
  { id: "t_s5_n3", seg: "Loop0310/N3/addressInformation", label: "Stop Address", d: 1, type: "el" },
  { id: "t_s5_n4c", seg: "Loop0310/N4/cityName", label: "Stop City", d: 1, type: "el" },
  { id: "t_s5_n4s", seg: "Loop0310/N4/stateOrProvinceCode", label: "Stop State", d: 1, type: "el" },
  { id: "t_s5_n4z", seg: "Loop0310/N4/postalCode", label: "Stop Postal Code", d: 1, type: "el" },
  { id: "t_s5_n4co", seg: "Loop0310/N4/countryCode", label: "Stop Country", d: 1, type: "el" },
  { id: "t_s5_at5", seg: "specialHandlingCode", label: "Special Handling Code", d: 1, type: "el" },
  { id: "t_s5_at5d", seg: "specialHandlingDescription", label: "Special Handling Desc", d: 1, type: "el" },

  { id: "t_l3", seg: "L3", label: "Total Weight/Charges", d: 0, type: "group", kids: ["t_l3_wt","t_l3_rate","t_l3_charges","t_l3_wtunit","t_l3_lading"] },
  { id: "t_l3_wt", seg: "weight", label: "Total Weight", d: 1, type: "el" },
  { id: "t_l3_rate", seg: "freightRate", label: "Freight Rate", d: 1, type: "el" },
  { id: "t_l3_charges", seg: "totalCharges", label: "Total Charges", d: 1, type: "el" },
  { id: "t_l3_wtunit", seg: "weightUnitCode", label: "Weight Unit Code", d: 1, type: "el" },
  { id: "t_l3_lading", seg: "ladingQuantity", label: "Lading Quantity", d: 1, type: "el" },
];

// ── SAMPLE CUSTOMER OVERRIDES ──
const SAMPLE_CUSTOMERS = ["(Base/Default)", "UPS SCS (UPSSCNL)", "Blommer (VISISHIPTMT)", "RAVAGO", "Zaxbys (01-743-1466)", "GordonFoods (148956225)", "Elanco (EXLFMT)", "Kroger", "Sears (148956225)", "MapleHill (008965063)"];

// ── STATE ──
const init = {
  maps: [],
  collapsed: {},
  selSrc: null,
  selMap: null,
  customer: "(Base/Default)",
  loopOps: {},
  changelog: [
    { id: 1, date: "2025-09-02", author: "Natalie", summary: "Updated N7 equipment mapping", status: "Completed" },
    { id: 2, date: "2025-09-03", author: "Susan", summary: "Updated L11 stop logic for MapleHill", status: "Completed" },
    { id: 3, date: "2025-09-05", author: "Susan", summary: "Added default of 1 for UPS ladingQuantity", status: "Completed" },
  ],
  txType: "204",
  ediVersion: "4010",
  targetFmt: "xml",
  view: "mapping",
};

// Transaction type labels for display
const TX_LABELS = { "204": "204 Load Tender", "990": "990 Tender Response", "214": "214 Shipment Status", "210": "210 Freight Invoice", "850": "850 Purchase Order", "855": "855 PO Acknowledgment", "856": "856 ASN", "810": "810 Invoice" };
const FMT_LABELS = { xml: "Internal XML", json: "JSON API", otm_xml: "OTM XML", soap: "SOAP/WS", csv: "CSV/Flat File", edi: "EDI (outbound)", wms_api: "WMS REST API" };

function red(s, a) {
  switch (a.type) {
    case "TOG": return { ...s, collapsed: { ...s.collapsed, [a.id]: !s.collapsed[a.id] } };
    case "SEL_SRC": return { ...s, selSrc: s.selSrc === a.id ? null : a.id };
    case "MAP": {
      if (!s.selSrc) return s;
      if (s.maps.find(m => m.tid === a.tid && !m.custOverride)) return s;
      const newMap = { id: `m${Date.now()}`, sid: s.selSrc, tid: a.tid, ruleType: "direct", value: "", custOverride: null, condition: "", confirmed: false, note: "" };
      return { ...s, maps: [...s.maps, newMap], selSrc: null, selMap: newMap.id };
    }
    case "SEL_MAP": return { ...s, selMap: a.id };
    case "DEL_MAP": return { ...s, maps: s.maps.filter(m => m.id !== a.id), selMap: s.selMap === a.id ? null : s.selMap };
    case "UPD_MAP": return { ...s, maps: s.maps.map(m => m.id === a.id ? { ...m, ...a.upd } : m) };
    case "ADD_OVERRIDE": {
      const base = s.maps.find(m => m.id === a.baseId);
      if (!base) return s;
      const ovr = { ...base, id: `m${Date.now()}`, custOverride: a.customer, ruleType: a.ruleType || "hardcode", value: "", condition: a.condition || "", confirmed: false };
      return { ...s, maps: [...s.maps, ovr], selMap: ovr.id };
    }
    case "SET_CUST": return { ...s, customer: a.val };
    case "SET_TX": return { ...s, txType: a.val, maps: [], collapsed: {}, selSrc: null, selMap: null };
    case "SET_VER": return { ...s, ediVersion: a.val };
    case "SET_TGTFMT": return { ...s, targetFmt: a.val };
    case "SET_VIEW": return { ...s, view: a.val };
    case "LOP": return { ...s, loopOps: { ...s.loopOps, [a.lid]: { op: a.op, cond: a.cond || "" } } };
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
        if (best) { used.add(best.id); nm.push({ id: `m${Date.now()}_${sf.id}`, sid: sf.id, tid: best.id, ruleType: "direct", value: "", custOverride: null, condition: "", confirmed: false, note: "" }); }
      });
      return { ...s, maps: [...s.maps, ...nm] };
    }
    default: return s;
  }
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

// ── TREE ROW ──
function TreeRow({ n, side, s, d: dispatch }) {
  const isEl = n.type === "el";
  const isLoop = n.type === "loop";
  const isGrp = n.type === "group";
  const baseMap = isEl ? s.maps.find(x => (side === "s" ? x.sid === n.id : x.tid === n.id) && !x.custOverride) : null;
  const overrides = isEl ? s.maps.filter(x => (side === "s" ? x.sid === n.id : x.tid === n.id) && x.custOverride) : [];
  const isMapped = !!baseMap;
  const isSel = side === "s" && s.selSrc === n.id;
  const isActive = s.selMap && (baseMap?.id === s.selMap || overrides.some(o => o.id === s.selMap));
  const indent = n.d * 20;
  const lop = s.loopOps[n.id];

  const bars = [];
  for (let i = 1; i <= n.d; i++) {
    bars.push(<div key={i} style={{ position: "absolute", left: i * 20 - 10, top: 0, bottom: 0, width: 1, background: (side === "s" ? C.bl : C.pu) + "18" }} />);
  }

  return (
    <div>
      <div
        onClick={() => {
          if (n.kids?.length && !isEl) dispatch({ type: "TOG", id: n.id });
          else if (isEl && side === "s") dispatch({ type: "SEL_SRC", id: n.id });
          else if (isEl && side === "t" && s.selSrc) dispatch({ type: "MAP", tid: n.id });
          if (isEl && baseMap) dispatch({ type: "SEL_MAP", id: baseMap.id });
        }}
        style={{
          display: "grid",
          gridTemplateColumns: side === "s" ? "minmax(160px,2fr) 1.2fr 0.7fr" : "minmax(160px,2fr) 1.2fr",
          borderBottom: `1px solid ${isLoop ? C.bHard : C.border}`,
          background: isActive ? "#fef3c7" : isSel ? C.blS : isMapped ? (baseMap?.confirmed ? C.gnS : "#fdfcf5") : isLoop ? C.cream : C.paper,
          cursor: isEl ? "pointer" : "default", position: "relative",
        }}
      >
        {bars}
        <div style={{ padding: "5px 6px 5px " + (indent + 6) + "px", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          {n.kids?.length && !isEl ? (
            <span onClick={e => { e.stopPropagation(); dispatch({ type: "TOG", id: n.id }); }} style={{ cursor: "pointer", fontSize: 9, color: C.t3, width: 12, textAlign: "center", flexShrink: 0 }}>{s.collapsed[n.id] ? "▶" : "▼"}</span>
          ) : isEl ? (
            <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, border: `2px solid ${isMapped ? (baseMap?.confirmed ? C.gn : C.bl) : isSel ? C.bl : C.border}`, background: isMapped ? (baseMap?.confirmed ? C.gn : C.bl) : "transparent" }} />
          ) : <span style={{ width: 12 }} />}
          {isLoop && <span style={{ fontSize: 7, fontWeight: 800, padding: "0 3px", borderRadius: 2, background: C.amS, color: C.am, fontFamily: C.mono, flexShrink: 0, lineHeight: "14px" }}>LOOP{n.max ? ` ≤${n.max}` : ""}</span>}
          {isGrp && <span style={{ fontSize: 7, fontWeight: 800, padding: "0 3px", borderRadius: 2, background: C.blS, color: C.bl, fontFamily: C.mono, flexShrink: 0, lineHeight: "14px" }}>GRP</span>}
          <span style={{ fontSize: 10, fontFamily: C.mono, fontWeight: 600, color: isLoop ? C.am : isGrp ? C.bl : C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.seg}</span>
          {overrides.length > 0 && <span style={{ fontSize: 7, fontWeight: 800, padding: "0 4px", borderRadius: 8, background: C.orS, color: C.or, fontFamily: C.mono, flexShrink: 0, lineHeight: "14px" }}>{overrides.length} OVR</span>}
        </div>
        <div style={{ padding: "5px 6px", borderRight: side === "s" ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: C.tx, fontWeight: isLoop || isGrp ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
          {n.note && <span style={{ fontSize: 7, color: C.t3, flexShrink: 0 }} title={n.note}>ⓘ</span>}
        </div>
        {side === "s" && (
          <div style={{ padding: "5px 6px", overflow: "hidden" }}>
            {isEl && <span style={{ fontSize: 9, fontFamily: C.mono, color: C.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{n.sample}</span>}
          </div>
        )}
      </div>
      {/* Loop config bar */}
      {isLoop && side === "s" && (
        <div style={{ paddingLeft: indent + 28, padding: "2px 6px 2px " + (indent + 28) + "px", background: C.amS, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
          <span style={{ fontWeight: 700, color: C.t3 }}>Array:</span>
          <select value={lop?.op || "copy_all"} onChange={e => dispatch({ type: "LOP", lid: n.id, op: e.target.value, cond: "" })} style={{ padding: "1px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer" }}>
            <option value="copy_all">Copy all</option><option value="filter">Filter</option><option value="first">First only</option><option value="agg">Aggregate</option>
          </select>
          {(lop?.op === "filter" || lop?.op === "agg") && (
            <input placeholder={lop.op === "filter" ? '"only where qualifier = BM"' : '"sum weights"'} style={{ flex: 1, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.focus}`, fontSize: 9, outline: "none", background: C.white }} />
          )}
        </div>
      )}
      {/* Inline mapping indicator */}
      {isMapped && side === "s" && (
        <div onClick={() => dispatch({ type: "SEL_MAP", id: baseMap.id })} style={{
          paddingLeft: indent + 28, padding: "2px 6px 2px " + (indent + 28) + "px",
          background: isActive ? "#fef3c7" : baseMap.confirmed ? "#eefbf0" : "#fffff5",
          borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
        }}>
          <span style={{ fontSize: 9, color: RULE_TYPES[baseMap.ruleType]?.color || C.bl }}>{RULE_TYPES[baseMap.ruleType]?.icon || "→"}</span>
          <span style={{ fontSize: 9, fontFamily: C.mono, color: C.pu, fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {TGT.find(t => t.id === baseMap.tid)?.seg}
          </span>
          {baseMap.ruleType !== "direct" && baseMap.value && <span style={{ fontSize: 8, color: C.t2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>= "{baseMap.value}"</span>}
          {overrides.length > 0 && <span style={{ fontSize: 7, color: C.or, fontWeight: 700 }}>+{overrides.length} overrides</span>}
          <span style={{ fontSize: 8, color: baseMap.confirmed ? C.gn : C.t3, marginLeft: "auto" }}>{baseMap.confirmed ? "✓" : "○"}</span>
        </div>
      )}
    </div>
  );
}

// ── RULE DETAIL PANEL ──
function RulePanel({ s, d: dispatch }) {
  const sel = s.selMap ? s.maps.find(m => m.id === s.selMap) : null;
  if (!sel) return (
    <div style={{ padding: 20, textAlign: "center", color: C.t3, fontSize: 12 }}>
      Select a mapping to view/edit rules. Click a source field (left), then a target field (right) to create a mapping.
    </div>
  );
  const srcNode = SRC.find(n => n.id === sel.sid);
  const tgtNode = TGT.find(n => n.id === sel.tid);
  const baseMap = s.maps.find(m => m.sid === sel.sid && m.tid === sel.tid && !m.custOverride);
  const overrides = s.maps.filter(m => m.sid === sel.sid && m.tid === sel.tid && m.custOverride);
  const [ovrCust, setOvrCust] = useState("");
  const [ovrType, setOvrType] = useState("hardcode");

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Rule editor */}
      <div style={{ flex: 1, padding: "10px 14px", overflowY: "auto", borderRight: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.tx, marginBottom: 6 }}>
          {srcNode?.seg} <span style={{ color: C.bl }}>→</span> {tgtNode?.seg}
        </div>
        <div style={{ fontSize: 9, color: C.t3, marginBottom: 10 }}>{srcNode?.label} → {tgtNode?.label}</div>

        {/* Base rule */}
        <div style={{ background: C.blS, border: `1px solid ${C.bl}22`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.bl, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Base / Default Rule</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <select value={baseMap?.ruleType || "direct"} onChange={e => baseMap && dispatch({ type: "UPD_MAP", id: baseMap.id, upd: { ruleType: e.target.value } })} style={{ padding: "3px 6px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, background: C.white, cursor: "pointer", fontFamily: C.font }}>
              {Object.entries(RULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            {baseMap && baseMap.ruleType !== "direct" && baseMap.ruleType !== "suppress" && baseMap.ruleType !== "currentDate" && baseMap.ruleType !== "currentTime" && (
              <input value={baseMap.value || ""} onChange={e => dispatch({ type: "UPD_MAP", id: baseMap.id, upd: { value: e.target.value } })}
                placeholder={baseMap.ruleType === "hardcode" ? '"CLLQ"' : baseMap.ruleType === "autoIncrement" ? "Start from 1" : "Value..."}
                style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, outline: "none", fontFamily: C.mono, background: C.white }} />
            )}
          </div>
          {baseMap && (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => dispatch({ type: "UPD_MAP", id: baseMap.id, upd: { confirmed: !baseMap.confirmed } })} style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: C.font,
                border: `1px solid ${baseMap.confirmed ? C.gnB : C.border}`, background: baseMap.confirmed ? C.gnS : C.white, color: baseMap.confirmed ? C.gn : C.bl,
              }}>{baseMap.confirmed ? "✓ Confirmed" : "Confirm"}</button>
              <button onClick={() => dispatch({ type: "DEL_MAP", id: baseMap.id })} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, cursor: "pointer", border: `1px solid ${C.border}`, background: C.white, color: C.rd, fontFamily: C.font }}>Delete</button>
            </div>
          )}
        </div>

        {/* Customer overrides */}
        <div style={{ fontSize: 9, fontWeight: 700, color: C.or, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Customer-Specific Overrides ({overrides.length})
        </div>
        {overrides.map(ovr => (
          <div key={ovr.id} onClick={() => dispatch({ type: "SEL_MAP", id: ovr.id })} style={{
            background: s.selMap === ovr.id ? "#fef3c7" : C.orS, border: `1px solid ${C.or}22`, borderRadius: 6, padding: 8, marginBottom: 4, cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.or }}>{ovr.custOverride}</span>
              <button onClick={e => { e.stopPropagation(); dispatch({ type: "DEL_MAP", id: ovr.id }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: C.rd }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <select value={ovr.ruleType} onChange={e => dispatch({ type: "UPD_MAP", id: ovr.id, upd: { ruleType: e.target.value } })} style={{ padding: "2px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer" }}>
                {Object.entries(RULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              {ovr.ruleType !== "direct" && ovr.ruleType !== "suppress" && ovr.ruleType !== "currentDate" && ovr.ruleType !== "currentTime" && (
                <input value={ovr.value || ""} onChange={e => dispatch({ type: "UPD_MAP", id: ovr.id, upd: { value: e.target.value } })}
                  placeholder="Value..." onClick={e => e.stopPropagation()}
                  style={{ flex: 1, padding: "2px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, outline: "none", fontFamily: C.mono, background: C.white }} />
              )}
            </div>
            <input value={ovr.condition || ""} onChange={e => dispatch({ type: "UPD_MAP", id: ovr.id, upd: { condition: e.target.value } })}
              placeholder='Condition: "If ISA*06 = UPSSCNL and N1*01 = BT..."' onClick={e => e.stopPropagation()}
              style={{ width: "100%", padding: "2px 4px", borderRadius: 3, border: `1px solid ${C.border}`, fontSize: 9, outline: "none", fontFamily: C.font, background: C.white, marginTop: 4, boxSizing: "border-box" }} />
          </div>
        ))}

        {/* Add override */}
        {baseMap && (
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <select value={ovrCust} onChange={e => setOvrCust(e.target.value)} style={{ flex: 1, padding: "3px 4px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer" }}>
              <option value="">Select customer...</option>
              {SAMPLE_CUSTOMERS.filter(c => c !== "(Base/Default)").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={ovrType} onChange={e => setOvrType(e.target.value)} style={{ padding: "3px 4px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer" }}>
              {Object.entries(RULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <button onClick={() => { if (ovrCust) { dispatch({ type: "ADD_OVERRIDE", baseId: baseMap.id, customer: ovrCust, ruleType: ovrType }); setOvrCust(""); } }} disabled={!ovrCust} style={{
              padding: "3px 8px", borderRadius: 4, border: "none", cursor: ovrCust ? "pointer" : "default",
              background: ovrCust ? C.or : C.border, color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: C.font, opacity: ovrCust ? 1 : 0.5,
            }}>+ Override</button>
          </div>
        )}
      </div>

      {/* Notes / sample */}
      <div style={{ width: 200, padding: "10px 12px", background: C.cream, overflowY: "auto" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</div>
        <textarea value={sel.note || ""} onChange={e => dispatch({ type: "UPD_MAP", id: sel.id, upd: { note: e.target.value } })}
          placeholder="Add mapping notes, internal comments, or references to original DMA..."
          style={{ width: "100%", height: 60, padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, fontFamily: C.font, resize: "vertical", outline: "none", boxSizing: "border-box" }} />

        <div style={{ fontSize: 9, fontWeight: 700, color: C.t3, marginTop: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Sample Data</div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.tx, background: C.white, padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, wordBreak: "break-all" }}>
          {srcNode?.sample || "—"}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, color: C.t3, marginTop: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Full XPath</div>
        <div style={{ fontSize: 8, fontFamily: C.mono, color: C.pu, background: C.white, padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, wordBreak: "break-all" }}>
          /EDI204V5010/{tgtNode?.seg || ""}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, color: C.t3, marginTop: 10, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Rule Summary</div>
        <div style={{ fontSize: 9, color: C.tx, lineHeight: 1.5 }}>
          <div><strong>Base:</strong> {RULE_TYPES[baseMap?.ruleType]?.label || "—"} {baseMap?.value && `"${baseMap.value}"`}</div>
          {overrides.map(o => (
            <div key={o.id} style={{ color: C.or }}><strong>{o.custOverride}:</strong> {RULE_TYPES[o.ruleType]?.label} {o.value && `"${o.value}"`}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──
export default function App() {
  const [s, d] = useReducer(red, init);
  const vs = SRC.filter(n => isVis(n, SRC, s.collapsed));
  const vt = TGT.filter(n => isVis(n, TGT, s.collapsed));
  const baseMaps = s.maps.filter(m => !m.custOverride);
  const stats = { total: baseMaps.length, ok: baseMaps.filter(m => m.confirmed).length, overrides: s.maps.filter(m => m.custOverride).length };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, fontFamily: C.font, color: C.tx }}>
      <link href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700;800&family=Fira+Code:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;margin:0}input::placeholder,textarea::placeholder{color:${C.t3}}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.bHard};border-radius:2px}`}</style>

      {/* Header */}
      <div style={{ background: C.paper, borderBottom: `1px solid ${C.bHard}`, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: 1.5, background: C.bl, transform: "rotate(45deg)" }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>IntegrateOS</span>
          <span style={{ color: C.border }}>|</span>
          <select value={s.txType || "204"} onChange={e => d({ type: "SET_TX", val: e.target.value })} style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, background: C.white, cursor: "pointer", fontFamily: C.font, color: C.bl }}>
            <optgroup label="Load Tendering">
              <option value="204">204 Load Tender</option>
              <option value="990">990 Tender Response</option>
            </optgroup>
            <optgroup label="Shipment Status">
              <option value="214">214 Shipment Status</option>
            </optgroup>
            <optgroup label="Freight Billing">
              <option value="210">210 Freight Invoice</option>
            </optgroup>
            <optgroup label="Purchase Orders">
              <option value="850">850 Purchase Order</option>
              <option value="855">855 PO Acknowledgment</option>
            </optgroup>
            <optgroup label="Shipping">
              <option value="856">856 Advance Ship Notice (ASN)</option>
            </optgroup>
            <optgroup label="Invoicing">
              <option value="810">810 Invoice</option>
            </optgroup>
          </select>
          <select value={s.ediVersion || "4010"} onChange={e => d({ type: "SET_VER", val: e.target.value })} style={{ padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer", fontFamily: C.mono, color: C.t2 }}>
            <option value="3040">X12 3040</option>
            <option value="4010">X12 4010</option>
            <option value="4030">X12 4030</option>
            <option value="5010">X12 5010</option>
          </select>
          <select value={s.targetFmt || "xml"} onChange={e => d({ type: "SET_TGTFMT", val: e.target.value })} style={{ padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer", fontFamily: C.font, color: C.t2 }}>
            <option value="xml">→ Internal XML</option>
            <option value="json">→ JSON API</option>
            <option value="otm_xml">→ OTM XML</option>
            <option value="soap">→ SOAP/WS</option>
            <option value="csv">→ CSV/Flat File</option>
            <option value="edi">→ EDI (outbound)</option>
            <option value="wms_api">→ WMS REST API</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select value={s.customer} onChange={e => d({ type: "SET_CUST", val: e.target.value })} style={{ padding: "3px 6px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 9, background: C.white, cursor: "pointer", fontFamily: C.font }}>
            {SAMPLE_CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: 8, fontFamily: C.mono, color: C.t3 }}>{stats.ok}/{stats.total} base · {stats.overrides} overrides</span>
          <button onClick={() => d({ type: "SET_VIEW", val: s.view === "mapping" ? "changelog" : "mapping" })} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: s.view === "changelog" ? C.amS : C.white, cursor: "pointer", fontSize: 9, fontWeight: 600, color: C.t2, fontFamily: C.font }}>
            {s.view === "changelog" ? "← Mapping" : "📋 Change Log"}
          </button>
          <button onClick={() => d({ type: "AUTO" })} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.bl}33`, background: C.blS, cursor: "pointer", fontSize: 9, fontWeight: 700, color: C.bl, fontFamily: C.font }}>🤖 Auto-Map</button>
        </div>
      </div>

      {s.view === "changelog" ? (
        /* Change Log View */
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Change Log</div>
          <div style={{ background: C.paper, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 90px 80px 1fr 100px", padding: "8px 12px", borderBottom: `1px solid ${C.bHard}`, fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase" }}>
              <div>ID</div><div>Date</div><div>Author</div><div>Summary</div><div>Status</div>
            </div>
            {s.changelog.map(c => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "60px 90px 80px 1fr 100px", padding: "6px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, alignItems: "center" }}>
                <div style={{ fontFamily: C.mono, color: C.t3 }}>{c.id}</div>
                <div style={{ fontFamily: C.mono, fontSize: 10 }}>{c.date}</div>
                <div style={{ fontWeight: 600 }}>{c.author}</div>
                <div style={{ color: C.t2 }}>{c.summary}</div>
                <div><span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: c.status === "Completed" ? C.gnS : C.amS, color: c.status === "Completed" ? C.gn : C.am, fontWeight: 600 }}>{c.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Mapping View */
        <>
          {/* Tree panels */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* SOURCE */}
            <div style={{ flex: 1, borderRight: `2px solid ${C.bHard}`, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ padding: "4px 8px", background: C.cream, borderBottom: `1px solid ${C.bHard}`, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 7, fontWeight: 800, padding: "0 4px", borderRadius: 2, background: C.blS, color: C.bl, fontFamily: C.mono }}>⟨⟩ X12 {s.ediVersion}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{TX_LABELS[s.txType] || s.txType}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,2fr) 1.2fr 0.7fr", background: C.cream, borderBottom: `1px solid ${C.bHard}`, fontSize: 8, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>Segment</div>
                <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>Description</div>
                <div style={{ padding: "3px 6px" }}>Sample</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {vs.map(n => <TreeRow key={n.id} n={n} side="s" s={s} d={d} />)}
              </div>
            </div>

            {/* TARGET */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ padding: "4px 8px", background: C.cream, borderBottom: `1px solid ${C.bHard}`, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 7, fontWeight: 800, padding: "0 4px", borderRadius: 2, background: C.puS, color: C.pu, fontFamily: C.mono }}>{s.targetFmt === "json" ? "{}" : s.targetFmt === "csv" ? "CSV" : s.targetFmt === "edi" ? "⟨⟩" : "XML"}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{FMT_LABELS[s.targetFmt] || "Internal XML"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,2fr) 1.2fr", background: C.cream, borderBottom: `1px solid ${C.bHard}`, fontSize: 8, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                <div style={{ padding: "3px 6px", borderRight: `1px solid ${C.border}` }}>XPath / Field</div>
                <div style={{ padding: "3px 6px" }}>Description</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {vt.map(n => <TreeRow key={n.id} n={n} side="t" s={s} d={d} />)}
              </div>
            </div>
          </div>

          {/* Bottom: Rule Detail Panel */}
          <div style={{ height: 220, borderTop: `2px solid ${C.bHard}`, background: C.paper, flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "4px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.cream }}>
              <span style={{ fontSize: 10, fontWeight: 700 }}>📐 Rule Detail</span>
              <span style={{ fontSize: 8, color: C.t3 }}>Select a mapped field to view base rule + customer overrides</span>
              {s.selMap && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  {Object.entries(RULE_TYPES).slice(0, 6).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 7, padding: "0 4px", borderRadius: 2, background: v.color + "15", color: v.color, fontWeight: 700, fontFamily: C.mono, lineHeight: "14px" }}>{v.icon} {v.label}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: "calc(100% - 28px)" }}>
              <RulePanel s={s} d={d} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
