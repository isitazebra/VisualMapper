/**
 * Blue Yonder WMS — seeded mapping based on the TradeEdge
 * (reference-dmas/tradeedge_starbucks.xlsx) pattern of an inbound
 * despatch advice / ship confirm flow into a Blue Yonder WMS.
 *
 * Source schema is the built-in X12 856 ASN; target is the generic
 * JSON API shape (json:default). This demonstrates X12 → JSON which is
 * a common real-world pattern for modern warehouse APIs.
 */
import type { PrismaClient } from "@prisma/client";
import { upsertSpec, type SeedMapping } from "./helpers";

const SAMPLE_856 = `ISA*00*          *00*          *ZZ*SUPPLIER       *02*KRGR           *240318*1430*U*00401*000009988*0*P*~
GS*SH*SUPPLIER*KRGR*20240318*143000*9988*X*004010~
ST*856*998801~
BSN*01*00*02*SHP-99841*03*20240318*04*1430~
HL*1**S~
TD1*02*12~
TD5*03*ODFL*04*M~
TD3*03*ODFL-44872~
REF*BM*BOL-887421~
DTM*011*20240318~
DTM*017*20240320~
N1*SF*AIT Dallas DC~
N1*ST*Kroger DC #847~
HL*2*1*O~
PRF*01*PO-88712*04*20240310~
HL*3*2*T~
MAN*GM*00300712345600001234~
PO4*01*48*08*1842.5~
HL*4*3*P~
MAN*GM*00300712345600005678~
SN1*02*48~
HL*5*4*I~
LIN*UP*012345678905~
SN1*02*576*03*EA~
PID*F*08*Organic Wheat Bread~
REF*LT*LOT-2024-A117~
SE*27*998801~
GE*1*9988~
IEA*1*000009988~`;

function blueYonder856Mappings(): SeedMapping[] {
  return [
    // Carrier SCAC from the TD5 segment.
    {
      sourceFieldId: "td503",
      targetFieldId: "j1",
      ruleType: "direct",
      confirmed: true,
      notes: "Carrier SCAC — TradeEdge DMA row 34 equivalent.",
    },

    // Shipment ID — BSN*02 is the canonical identifier.
    {
      sourceFieldId: "bsn2",
      targetFieldId: "j2",
      ruleType: "direct",
      confirmed: true,
      notes: "Shipment ID from BSN purpose line.",
    },

    // Status — hardcoded from context (an 856 means "shipped").
    {
      sourceFieldId: "bsn1",
      targetFieldId: "j3",
      ruleType: "hardcode",
      value: "SHIPPED",
      confirmed: true,
      notes:
        "BSN*01 is the purpose code (00=Original). The target status for an ASN receipt is always 'SHIPPED'.",
    },

    // References loop — PO number from PRF becomes a ref entry.
    {
      sourceFieldId: "prf1",
      targetFieldId: "j42",
      ruleType: "direct",
      notes: "PO number → references[].value.",
    },
    {
      sourceFieldId: "prf1",
      targetFieldId: "j41",
      ruleType: "hardcode",
      value: "PO",
      notes: "Qualifier fixed for PRF segment.",
    },

    // Stop loop — ship-from / ship-to from N1 segments.
    {
      sourceFieldId: "n1sf",
      targetFieldId: "j52",
      ruleType: "direct",
      notes: "Ship-from name.",
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "concat",
          value: " [KRGR]",
          notes: "Kroger DC ingest appends '[KRGR]' to the ship-from name.",
        },
      ],
    },
    {
      sourceFieldId: "n1sf",
      targetFieldId: "j51",
      ruleType: "hardcode",
      value: "PICKUP",
      notes: "Stop type marker.",
    },
    {
      sourceFieldId: "dtms",
      targetFieldId: "j55",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      confirmed: true,
    },

    // Weight (from PO4*08 pallet weight).
    {
      sourceFieldId: "po4w",
      targetFieldId: "j6",
      ruleType: "direct",
      notes: "Pallet gross weight — passed through; Phase 3 will add unit conversion.",
    },

    // Pieces count (from TD1*02 pallet count).
    {
      sourceFieldId: "td102",
      targetFieldId: "j7",
      ruleType: "direct",
      confirmed: true,
      notes: "Pallet count — doubles as 'pieces' in the WMS.",
    },
  ];
}

export async function seedBlueYonderMappings(
  prisma: PrismaClient,
  partnerId: string,
): Promise<void> {
  await upsertSpec(prisma, {
    slug: "blueyonder-856-json",
    partnerId,
    name: "Blue Yonder 856 ASN → JSON Shipment API",
    txType: "856",
    ediVersion: "4010",
    sourceFormat: "x12",
    targetFormat: "json",
    sourceSchemaId: "x12:856",
    targetSchemaId: "json:default",
    status: "draft",
    direction: "outbound",
    samplePayload: SAMPLE_856,
    mappings: blueYonder856Mappings(),
  });
}
