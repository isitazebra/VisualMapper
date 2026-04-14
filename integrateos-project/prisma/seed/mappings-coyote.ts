/**
 * Coyote Logistics — seeded mappings based on patterns from the real
 * Coyote DMAs (reference-dmas/204_coyote_mrs.xlsx etc.). Source schema
 * is the corresponding X12 built-in, target is internal XML.
 *
 * Customer overrides reproduce the "UPS SCS" and "Kroger" override
 * patterns found in the DMA's per-customer sheets.
 */
import type { PrismaClient } from "@prisma/client";
import { upsertSpec, type SeedMapping } from "./helpers";

const SAMPLE_204 = `ISA*00*          *00*          *ZZ*UPSSCNL        *02*CLLQ           *250318*1430*U*00401*000017090*0*P*~
GS*SM*UPSSCNL*CLLQ*20250318*143000*1709*X*004010~
ST*204*017090001~
B2*02*CLNL*04*LD23029450*06*PP~
B2A*01*00*02*LT~
L11*01*LD23029450*02*BM~
NTE*02*CHECK-IN GATE B~
N7*02*TRL-4472*11*TL~
N1*01*BT*02*UPS SCS*03*93*04*UPSSCSNL~
N3*01*LUCHTHAVENWEG 57~
N4*01*EINDHOVEN*02*NB*03*5657 EA*04*NL~
S5*01*1*02*CL~
L11*01*EUNLDELL01*02*11~
G62*01*37*02*20250825*04*130000~
AT8*01*G*03*42500*05*33~
N1*01*SH*02*DELL~
N3*01*100 DELL WAY~
N4*01*ROUND ROCK*02*TX*03*78682*04*US~
L3*01*42500*03*1250.00*05*1250.00~
SE*20*017090001~
GE*1*1709~
IEA*1*000017090~`;

const SAMPLE_214 = `ISA*00*          *00*          *ZZ*CLLQ           *02*UPSSCNL        *250509*1245*U*00401*000016566*0*P*~
GS*QM*CLLQ*UPSSCNL*20250509*124500*16566*X*004010~
ST*214*16566001~
B10*01*16566270*02*T2120*03*CLLQ~
L11*01*16566270*02*CN~
N1*01*SH*02*LINEAGE LOGISTICS~
N3*01*2501 BROADWAY~
N4*01*CHEEKTOWAGA*02*NY*03*14227*04*US~
LX*01*1~
AT7*01*X1*02*NS*05*20250509*06*1230*07*PT~
MS1*01*RIVERSIDE*02*CA*03*USA~
MS2*01*CLLQ*02*TRL-447821~
SE*10*16566001~
GE*1*16566~
IEA*1*000016566~`;

const SAMPLE_210 = `ISA*00*          *00*          *ZZ*CLLQ           *02*KRGR           *250602*0930*U*00401*000326261*0*P*~
GS*IM*CLLQ*KRGR*20250602*093000*326261*X*004010~
ST*210*326261001~
B3*02*3262611601*03*769933*04*CC*06*20250602*07*157408*09*20250119*10*035*11*CLLQ*12*20250702~
C3*01*USD~
N9*01*PO*02*769933~
N1*01*SH*02*ELYRIA CENTRAL~
N3*01*800 LOGISTICS DR~
N4*01*ELYRIA*02*OH*03*44035~
LX*01*1~
L5*01*1*02*FAK~
L0*02*42500*08*24~
L1*01*1*03*450*04*1250.00*08*400~
L3*01*42500*02*1250.00*05*1562.50~
SE*14*326261001~
GE*1*326261~
IEA*1*000326261~`;

// ─── 204 Load Tender: base + customer overrides ──────────────────────
function coyote204Mappings(): SeedMapping[] {
  return [
    // Envelope (passthroughs — match the 204_4010_Base DMA where the
    // Logic column is blank).
    { sourceFieldId: "i06", targetFieldId: "tx01", ruleType: "direct", confirmed: true, notes: "Interchange Sender ID → target." },
    { sourceFieldId: "i08", targetFieldId: "tx02", ruleType: "direct", confirmed: true },
    { sourceFieldId: "g02", targetFieldId: "tx03", ruleType: "direct", confirmed: true },
    { sourceFieldId: "g03", targetFieldId: "tx04", ruleType: "direct", confirmed: true },

    // B2 shipment header — the SCAC in particular has customer overrides.
    {
      sourceFieldId: "b202",
      targetFieldId: "tx05",
      ruleType: "direct",
      confirmed: true,
      notes: "Standard Carrier Alpha Code — overridden for certain customers.",
      overrides: [
        {
          customerName: "UPS SCS",
          ruleType: "hardcode",
          value: "UPSN",
          condition: "If InterchangeSenderID = UPSSCNL",
          notes: "From the UPSPeakEquip DMA sheet.",
        },
        {
          customerName: "Kroger",
          ruleType: "conditional",
          value: "KRGR",
          condition: "If ISA*08 = KRGR then KRGR else CLLQ",
          notes: "Kroger DMA routes through their KRGR gateway.",
        },
      ],
    },
    { sourceFieldId: "b204", targetFieldId: "tx06", ruleType: "direct", confirmed: true, notes: "Shipment ID (Load ID)." },
    { sourceFieldId: "b206", targetFieldId: "tx07", ruleType: "direct" },

    { sourceFieldId: "b2a1", targetFieldId: "tx08", ruleType: "direct", confirmed: true, notes: "Purpose code — usually '00' (original)." },
    { sourceFieldId: "b2a2", targetFieldId: "tx09", ruleType: "direct" },

    // Header L11 references (loop).
    { sourceFieldId: "hl101", targetFieldId: "txl11", ruleType: "direct", notes: "L11*01 Reference ID (e.g. BOL, PO#)." },
    {
      sourceFieldId: "hl102",
      targetFieldId: "txl12",
      ruleType: "direct",
      overrides: [
        {
          customerName: "UPS SCS",
          ruleType: "suppress",
          condition: "If L11*02 = ZZ",
          notes: "UPS internal reference qualifier — don't forward.",
        },
      ],
    },
    { sourceFieldId: "hl103", targetFieldId: "txl13", ruleType: "direct" },

    // Notes.
    { sourceFieldId: "nte2", targetFieldId: "txn2", ruleType: "direct" },

    // Equipment.
    { sourceFieldId: "n702", targetFieldId: "txe1", ruleType: "direct", confirmed: true },
    {
      sourceFieldId: "n711",
      targetFieldId: "txe2",
      ruleType: "direct",
      overrides: [
        {
          customerName: "UPS SCS",
          ruleType: "lookup",
          value: "EQUIP_TYPE_UPS_PEAK",
          notes: "UPS peak season equipment codes differ; use the lookup table.",
        },
      ],
    },

    // Header-level parties loop (N1/N3/N4).
    {
      sourceFieldId: "n1h1",
      targetFieldId: "txp11",
      ruleType: "direct",
      confirmed: true,
      notes: "Entity code (BT/SH/ST/CN).",
    },
    { sourceFieldId: "n1h2", targetFieldId: "txp12", ruleType: "direct" },
    { sourceFieldId: "n1h3", targetFieldId: "txp13", ruleType: "direct" },
    { sourceFieldId: "n1h4", targetFieldId: "txp14", ruleType: "direct" },
    { sourceFieldId: "n3h1", targetFieldId: "txp15", ruleType: "direct" },
    { sourceFieldId: "n4h1", targetFieldId: "txp16", ruleType: "direct" },
    { sourceFieldId: "n4h2", targetFieldId: "txp17", ruleType: "direct" },
    { sourceFieldId: "n4h3", targetFieldId: "txp18", ruleType: "direct" },
    { sourceFieldId: "n4h4", targetFieldId: "txp19", ruleType: "direct" },

    // Stop loop (S5).
    { sourceFieldId: "s501", targetFieldId: "txs11", ruleType: "direct", confirmed: true, notes: "Stop sequence number." },
    { sourceFieldId: "s502", targetFieldId: "txs12", ruleType: "direct" },
    { sourceFieldId: "sl111", targetFieldId: "txs13", ruleType: "direct" },
    {
      sourceFieldId: "sl112",
      targetFieldId: "txs14",
      ruleType: "direct",
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "hardcode",
          value: "PO",
          condition: "Always",
          notes: "Kroger wants PO qualifier regardless of inbound.",
        },
      ],
    },
    { sourceFieldId: "sg622", targetFieldId: "txs15", ruleType: "dateFormat", value: "YYYYMMDD->ISO", notes: "X12 YYYYMMDD → ISO 8601." },
    { sourceFieldId: "sg624", targetFieldId: "txs16", ruleType: "direct" },
    { sourceFieldId: "sa803", targetFieldId: "txs17", ruleType: "direct" },
    { sourceFieldId: "sa801", targetFieldId: "txs18", ruleType: "direct" },
    { sourceFieldId: "sa805", targetFieldId: "txs19", ruleType: "direct" },
    { sourceFieldId: "sn101", targetFieldId: "txs1a", ruleType: "direct" },
    { sourceFieldId: "sn102", targetFieldId: "txs1b", ruleType: "direct" },
    { sourceFieldId: "sn301", targetFieldId: "txs1c", ruleType: "direct" },
    { sourceFieldId: "sn401", targetFieldId: "txs1d", ruleType: "direct" },
    { sourceFieldId: "sn402", targetFieldId: "txs1e", ruleType: "direct" },
    { sourceFieldId: "sn403", targetFieldId: "txs1f", ruleType: "direct" },

    // Totals (L3).
    { sourceFieldId: "l301", targetFieldId: "txw1", ruleType: "direct", confirmed: true },
    { sourceFieldId: "l303", targetFieldId: "txw2", ruleType: "direct" },
    { sourceFieldId: "l305", targetFieldId: "txw3", ruleType: "direct", confirmed: true },
  ];
}

// ─── 214 Shipment Status ─────────────────────────────────────────────
function coyote214Mappings(): SeedMapping[] {
  return [
    // Envelope scac (shared across all tx types).
    { sourceFieldId: "i06", targetFieldId: "t43", ruleType: "direct", confirmed: true, notes: "Sender SCAC." },

    // B10 shipment header.
    { sourceFieldId: "b1001", targetFieldId: "t41", ruleType: "direct", confirmed: true },
    { sourceFieldId: "b1002", targetFieldId: "t42", ruleType: "direct", confirmed: true, notes: "Shipment identification." },
    { sourceFieldId: "b1003", targetFieldId: "t43", ruleType: "direct", confirmed: true },

    // L11 reference.
    { sourceFieldId: "l11401", targetFieldId: "t44", ruleType: "direct" },
    { sourceFieldId: "l11402", targetFieldId: "t45", ruleType: "direct" },

    // Parties loop.
    { sourceFieldId: "n14_01", targetFieldId: "t461", ruleType: "direct" },
    { sourceFieldId: "n14_02", targetFieldId: "t462", ruleType: "direct" },
    { sourceFieldId: "n34_01", targetFieldId: "t463", ruleType: "direct" },
    { sourceFieldId: "n44_01", targetFieldId: "t464", ruleType: "direct" },
    { sourceFieldId: "n44_02", targetFieldId: "t465", ruleType: "direct" },
    { sourceFieldId: "n44_03", targetFieldId: "t466", ruleType: "direct" },
    { sourceFieldId: "n44_04", targetFieldId: "t467", ruleType: "direct" },

    // Assigned #.
    { sourceFieldId: "lx401", targetFieldId: "t47", ruleType: "direct" },

    // Status detail AT7 — the heart of a 214.
    {
      sourceFieldId: "at701",
      targetFieldId: "t48",
      ruleType: "lookup",
      value: "X12_214_STATUS",
      confirmed: true,
      notes: "Raw X12 status codes (X1/X3/AG/etc.) → internal status enum.",
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "lookup",
          value: "KROGER_214_STATUS",
          notes: "Kroger uses a different status taxonomy.",
        },
      ],
    },
    { sourceFieldId: "at702", targetFieldId: "t49", ruleType: "direct" },
    {
      sourceFieldId: "at705",
      targetFieldId: "t4a",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      notes: "Event date.",
    },
    { sourceFieldId: "at706", targetFieldId: "t4b", ruleType: "direct" },
    { sourceFieldId: "at707", targetFieldId: "t4c", ruleType: "direct" },

    // Location.
    { sourceFieldId: "ms101", targetFieldId: "t4d", ruleType: "direct" },
    { sourceFieldId: "ms102", targetFieldId: "t4e", ruleType: "direct" },

    // Equipment.
    { sourceFieldId: "ms202", targetFieldId: "t4f", ruleType: "direct", confirmed: true },
  ];
}

// ─── 210 Freight Invoice ─────────────────────────────────────────────
function coyote210Mappings(): SeedMapping[] {
  return [
    // B3 invoice header.
    { sourceFieldId: "b302", targetFieldId: "t21", ruleType: "direct", confirmed: true, notes: "Invoice #." },
    { sourceFieldId: "b303", targetFieldId: "t22", ruleType: "direct", confirmed: true },
    { sourceFieldId: "b304", targetFieldId: "t23", ruleType: "direct" },
    { sourceFieldId: "b306", targetFieldId: "t24", ruleType: "dateFormat", value: "YYYYMMDD->ISO", confirmed: true, notes: "Invoice date." },
    {
      sourceFieldId: "b307",
      targetFieldId: "t25",
      ruleType: "formula",
      value: "cents_to_dollars",
      confirmed: true,
      notes: "Net amount due — X12 carries cents; target expects dollars (divide by 100).",
    },
    { sourceFieldId: "b309", targetFieldId: "t26", ruleType: "dateFormat", value: "YYYYMMDD->ISO", notes: "Delivery date." },
    { sourceFieldId: "b311", targetFieldId: "t27", ruleType: "direct", confirmed: true },
    { sourceFieldId: "b312", targetFieldId: "t28", ruleType: "dateFormat", value: "YYYYMMDD->ISO" },

    // Currency.
    {
      sourceFieldId: "c301",
      targetFieldId: "t29",
      ruleType: "direct",
      confirmed: true,
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "hardcode",
          value: "USD",
          condition: "Always",
          notes: "Kroger hardcodes USD regardless of inbound C3.",
        },
      ],
    },

    // References loop.
    { sourceFieldId: "n9201", targetFieldId: "t2a1", ruleType: "direct" },
    { sourceFieldId: "n9202", targetFieldId: "t2a2", ruleType: "direct" },

    // Line items.
    { sourceFieldId: "lx201", targetFieldId: "t2b1", ruleType: "direct", confirmed: true },
    { sourceFieldId: "l502", targetFieldId: "t2b2", ruleType: "direct" },
    { sourceFieldId: "l002", targetFieldId: "t2b3", ruleType: "direct" },
    { sourceFieldId: "l103", targetFieldId: "t2b4", ruleType: "direct" },
    { sourceFieldId: "l104", targetFieldId: "t2b5", ruleType: "direct" },

    // Totals.
    { sourceFieldId: "l3t01", targetFieldId: "t2c", ruleType: "direct", confirmed: true },
    { sourceFieldId: "l3t05", targetFieldId: "t2d", ruleType: "formula", value: "cents_to_dollars", confirmed: true, notes: "Amount due in dollars." },
  ];
}

export async function seedCoyoteMappings(
  prisma: PrismaClient,
  partnerId: string,
): Promise<void> {
  await upsertSpec(prisma, {
    slug: "coyote-204-xml",
    partnerId,
    name: "Coyote 204 Load Tender → Internal XML",
    txType: "204",
    ediVersion: "4010",
    sourceFormat: "x12",
    targetFormat: "xml",
    sourceSchemaId: "x12:204",
    targetSchemaId: "xml:204",
    status: "review",
    samplePayload: SAMPLE_204,
    mappings: coyote204Mappings(),
  });

  await upsertSpec(prisma, {
    slug: "coyote-214-xml",
    partnerId,
    name: "Coyote 214 Shipment Status → Internal XML",
    txType: "214",
    ediVersion: "4010",
    sourceFormat: "x12",
    targetFormat: "xml",
    sourceSchemaId: "x12:214",
    targetSchemaId: "xml:214",
    status: "draft",
    samplePayload: SAMPLE_214,
    mappings: coyote214Mappings(),
  });

  await upsertSpec(prisma, {
    slug: "coyote-210-xml",
    partnerId,
    name: "Coyote 210 Freight Invoice → Internal XML",
    txType: "210",
    ediVersion: "4010",
    sourceFormat: "x12",
    targetFormat: "xml",
    sourceSchemaId: "x12:210",
    targetSchemaId: "xml:210",
    status: "review",
    samplePayload: SAMPLE_210,
    mappings: coyote210Mappings(),
  });
}
