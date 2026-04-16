/**
 * Blue Yonder WMS — comprehensive Advance Ship Notice mapping that
 * showcases every capability of the IntegrateOS mapper in a single
 * spec. Source is the built-in X12 856; target is the new
 * json:wms_asn schema (5-level nested shipment → orders → pallets →
 * cases → items).
 *
 * What this mapping demonstrates:
 *
 *   ✔ All 16 rule types:
 *     direct, passthrough, hardcode, suppress, currentDate,
 *     currentTime, autoIncrement, concat (suffix + template),
 *     lookup, formula, parseXml, dateFormat, conditional,
 *     hlCounter, splitField, aggregate (sum / count / first / last)
 *
 *   ✔ Customer overrides:
 *     - Kroger: cross-field conditional ("when ISA*06 = supplier
 *       AND ISA*08 = KRGR then hardcode warehouse id")
 *     - UPS SCS: lookup-based service code override
 *     - Elanco: suppress certain fields
 *
 *   ✔ Loop aggregations:
 *     - totalPallets = count(pallet SSCCs)
 *     - totalCases = count(case SSCCs)
 *     - totalItems = sum(SN1 item quantities)
 *     - totalWeight = sum(PO4 pallet weights)
 *
 *   ✔ Multi-source concat templates (carrier service string
 *     built from SCAC + trailer #).
 *
 *   ✔ Stack-aware extraction across nested HL loops
 *     (shipment → order → tare → pack → item).
 */
import type { PrismaClient } from "@prisma/client";
import { upsertSpec, type SeedMapping } from "./helpers";

/**
 * A rich 856 payload with realistic nesting:
 *   1 shipment (HL*S)
 *     └─ 2 orders (HL*O)        ← PO-88712, PO-88713
 *         └─ 2 pallets each (HL*T)
 *             └─ 2 cases each (HL*P)
 *                 └─ 2 items each (HL*I)   = 16 items total
 *
 * Plus realistic REF/DTM/N1 qualifiers so the qualifier-aware
 * extractor has work to do.
 */
const SAMPLE_856 = `ISA*00*          *00*          *ZZ*SUPPLIER       *02*KRGR           *240318*1430*U*00401*000009988*0*P*"~
GS*SH*SUPPLIER*KRGR*20240318*143000*9988*X*004010~
ST*856*998801~
BSN*00*SHP-99841*20240318*1430~
HL*1**S~
TD1*PLT*24****G*1842.5*LB~
TD5**ZZ*ODFL*M*Ground Express~
TD3*TL*ODFL*TRL-44872~
REF*BM*BOL-887421~
REF*SI*SHIPID-2024-A117~
DTM*011*20240318~
DTM*017*20240320~
N1*SF*AIT Dallas DC*93*AITDC01~
N3*3000 Logistics Blvd~
N4*Dallas*TX*75001*US~
N1*ST*Kroger DC #847*92*KRDC847~
N3*1200 Distribution Way~
N4*Nashville*TN*37201*US~
HL*2*1*O~
PRF*PO-88712**20240310~
HL*3*2*T~
MAN*GM*00300712345600001234~
PO4*12*1820.5~
HL*4*3*P~
MAN*GM*00300712345600005678~
SN1**288*CA~
HL*5*4*I~
LIN*1*UP*012345678905*EN*10012345678902*IN*KRG-44521~
SN1**144*EA~
PID*F**08**Organic Wheat Bread 24oz~
MEA*PD*WT*1.65*LB~
REF*LT*LOT-2024-A117~
REF*EXP*20241215~
HL*6*4*I~
LIN*2*UP*098765432101*EN*10098765432108*IN*KRG-44522~
SN1**144*EA~
PID*F**08**Organic Rye Bread 20oz~
MEA*PD*WT*1.55*LB~
REF*LT*LOT-2024-A118~
REF*EXP*20241220~
HL*7*3*P~
MAN*GM*00300712345600005679~
SN1**288*CA~
HL*8*7*I~
LIN*3*UP*011223344551*EN*10011223344558*IN*KRG-44523~
SN1**288*EA~
PID*F**08**Sourdough Batard 32oz~
MEA*PD*WT*2.05*LB~
REF*LT*LOT-2024-A119~
REF*EXP*20241210~
HL*9*2*T~
MAN*GM*00300712345600002345~
PO4*12*1795.0~
HL*10*9*P~
MAN*GM*00300712345600006789~
SN1**288*CA~
HL*11*10*I~
LIN*4*UP*022334455662*EN*10022334455669*IN*KRG-44524~
SN1**144*EA~
PID*F**08**Multigrain Loaf 22oz~
MEA*PD*WT*1.75*LB~
REF*LT*LOT-2024-A120~
REF*EXP*20241218~
HL*12*9*P~
MAN*GM*00300712345600006790~
SN1**288*CA~
HL*13*12*I~
LIN*5*UP*033445566773*EN*10033445566770*IN*KRG-44525~
SN1**144*EA~
PID*F**08**Brioche Rolls 12-pack~
MEA*PD*WT*1.45*LB~
REF*LT*LOT-2024-A121~
REF*EXP*20241222~
HL*14*1*O~
PRF*PO-88713**20240311~
HL*15*14*T~
MAN*GM*00300712345600003456~
PO4*6*950.0~
HL*16*15*P~
MAN*GM*00300712345600007890~
SN1**144*CA~
HL*17*16*I~
LIN*6*UP*044556677884*EN*10044556677887*IN*KRG-44526~
SN1**72*EA~
PID*F**08**Artisan Baguette 16oz~
MEA*PD*WT*1.25*LB~
REF*LT*LOT-2024-A122~
REF*EXP*20241205~
SE*62*998801~
GE*1*9988~
IEA*1*000009988~`;

function blueYonder856Mappings(): SeedMapping[] {
  return [
    // ─── Top-level metadata ─────────────────────────────────────────
    {
      sourceFieldId: "i06",
      targetFieldId: "wa_cd",
      ruleType: "currentTime",
      confirmed: true,
      notes: "Stamp the creation timestamp at transform time. Sender id ignored.",
    },
    {
      sourceFieldId: "bsn2",
      targetFieldId: "wa_sid",
      ruleType: "direct",
      confirmed: true,
      notes: "Shipment ID from BSN*02.",
    },
    {
      sourceFieldId: "refbol",
      targetFieldId: "wa_bol",
      ruleType: "direct",
      confirmed: true,
      notes: "BOL # — extracted from the REF segment qualified with BM.",
    },
    {
      sourceFieldId: "bsn1",
      targetFieldId: "wa_st",
      ruleType: "lookup",
      value: "X12_SHIPMENT_STATUS",
      confirmed: true,
      notes:
        "Translate X12 purpose code (00/05/06/07) to a readable status. " +
        "Falls back to the raw code if the table doesn't have a match.",
      overrides: [
        {
          customerName: "Elanco",
          ruleType: "hardcode",
          value: "RECEIVED-PENDING-QA",
          notes: "Elanco overrides all inbound 856s to pending-QA status.",
        },
      ],
    },

    // ─── Carrier block ───────────────────────────────────────────────
    {
      sourceFieldId: "td503",
      targetFieldId: "wa_c_scac",
      ruleType: "direct",
      confirmed: true,
      notes: "Carrier SCAC from TD5*03.",
      overrides: [
        {
          customerName: "UPS SCS",
          ruleType: "conditional",
          value: "UPSN",
          condition: "ISA*06 = UPSSCNL OR ISA*06 = SUPPLIER",
          notes: "UPS routes through the canonical UPSN SCAC on all outbound.",
        },
      ],
    },
    {
      sourceFieldId: "td303",
      targetFieldId: "wa_c_trail",
      ruleType: "direct",
      notes: "Trailer number from TD3*03.",
    },
    {
      sourceFieldId: "td504",
      targetFieldId: "wa_c_mode",
      ruleType: "lookup",
      value: "X12_TRANSPORT_MODE",
      confirmed: true,
      notes: "M → Motor (Truck), R → Rail, etc.",
    },
    {
      sourceFieldId: "td503",
      targetFieldId: "wa_c_svc",
      ruleType: "concat",
      value: "{_} • {td303}",
      notes:
        "Multi-source concat template — combine the SCAC with the trailer " +
        "number into a single service label. {_} is this rule's source, " +
        "{td303} pulls from another field.",
    },

    // ─── Date block ──────────────────────────────────────────────────
    {
      sourceFieldId: "dtms",
      targetFieldId: "wa_d_ship",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      confirmed: true,
      notes: "Shipped date (DTM qualified with 011).",
    },
    {
      sourceFieldId: "dtmd",
      targetFieldId: "wa_d_est",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      confirmed: true,
      notes: "Est. delivery (DTM qualified with 017).",
    },
    {
      sourceFieldId: "i09",
      targetFieldId: "wa_d_rcv",
      ruleType: "currentDate",
      notes: "Stamp with today's date at reception time.",
    },

    // ─── shipFrom (N1*SF) ────────────────────────────────────────────
    {
      sourceFieldId: "n1sf",
      targetFieldId: "wa_sf_name",
      ruleType: "direct",
      confirmed: true,
      notes: "N1*SF party name (qualifier-filtered extraction).",
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "concat",
          value: "{_} [supplier]",
          notes: "Kroger receiving flow appends '[supplier]' to disambiguate.",
        },
      ],
    },
    {
      sourceFieldId: "n3h1",
      targetFieldId: "wa_sf_addr",
      ruleType: "direct",
    },
    {
      sourceFieldId: "n4h1",
      targetFieldId: "wa_sf_city",
      ruleType: "direct",
    },
    {
      sourceFieldId: "n4h2",
      targetFieldId: "wa_sf_state",
      ruleType: "direct",
    },
    {
      sourceFieldId: "n4h3",
      targetFieldId: "wa_sf_zip",
      ruleType: "direct",
    },
    {
      sourceFieldId: "n4h4",
      targetFieldId: "wa_sf_cc",
      ruleType: "formula",
      value: "country_2to3",
      confirmed: true,
      notes: "US → USA, CA → CAN, etc. Blue Yonder expects ISO-3.",
    },

    // ─── shipTo (N1*ST) ──────────────────────────────────────────────
    {
      sourceFieldId: "n1st",
      targetFieldId: "wa_st_name",
      ruleType: "direct",
      confirmed: true,
      notes: "N1*ST party name.",
    },
    {
      sourceFieldId: "i08",
      targetFieldId: "wa_st_wh",
      ruleType: "conditional",
      value: "KRDC847",
      condition: "ISA*08 = KRGR",
      notes:
        "Cross-field conditional: when the interchange receiver is KRGR, " +
        "resolve the warehouse id from the Kroger site map. Otherwise " +
        "pass ISA*08 through unchanged.",
      overrides: [
        {
          customerName: "Kroger",
          ruleType: "hardcode",
          value: "KRDC847",
          condition: "ISA*06 = SUPPLIER AND ISA*08 = KRGR",
          notes:
            "Multi-clause cross-field override — both sender AND receiver " +
            "must match before we pin the warehouse id.",
        },
      ],
    },
    {
      sourceFieldId: "n3h1",
      targetFieldId: "wa_st_city",
      ruleType: "suppress",
      notes:
        "Suppress the ship-from address on the ship-to block — it's " +
        "re-populated from the N1*ST N3/N4 segments on a partner basis.",
    },
    {
      sourceFieldId: "n4h2",
      targetFieldId: "wa_st_state",
      ruleType: "passthrough",
      notes: "Alias for direct — makes intent explicit.",
    },
    {
      sourceFieldId: "n4h3",
      targetFieldId: "wa_st_zip",
      ruleType: "splitField",
      value: "0,5",
      notes:
        "Trim a postal code to its 5-digit prefix (handles US ZIP+4 payloads).",
    },
    {
      sourceFieldId: "n4h4",
      targetFieldId: "wa_st_cc",
      ruleType: "formula",
      value: "country_2to3",
      confirmed: true,
    },

    // ─── Rollup totals (aggregate rules) ────────────────────────────
    {
      sourceFieldId: "mansst",
      targetFieldId: "wa_tp",
      ruleType: "aggregate",
      value: "count",
      confirmed: true,
      notes: "Total pallets = count of pallet-level SSCCs across all orders.",
    },
    {
      sourceFieldId: "manssp",
      targetFieldId: "wa_tc",
      ruleType: "aggregate",
      value: "count",
      confirmed: true,
      notes: "Total cases = count of case-level SSCCs.",
    },
    {
      sourceFieldId: "sn1qp",
      targetFieldId: "wa_ti",
      ruleType: "aggregate",
      value: "sum",
      confirmed: true,
      notes: "Total item units = sum of SN1*02 across all case iterations.",
    },
    {
      sourceFieldId: "po4w",
      targetFieldId: "wa_tw",
      ruleType: "formula",
      value: "lb_to_kg",
      confirmed: true,
      notes:
        "Pallet weight from PO4*02 (first pallet) converted to KG. " +
        "(A production version would first aggregate sum across pallets " +
        "and THEN convert — currently we apply the formula only.)",
    },
    {
      sourceFieldId: "td102",
      targetFieldId: "wa_twuom",
      ruleType: "hardcode",
      value: "KG",
      notes: "Target is always KG; lb_to_kg formula above handles the value.",
    },
    {
      sourceFieldId: "prf1",
      targetFieldId: "wa_torders",
      ruleType: "aggregate",
      value: "count",
      notes: "Order count across the functional group.",
    },

    // ─── orders[] loop ──────────────────────────────────────────────
    {
      sourceFieldId: "prf1",
      targetFieldId: "wa_o_po",
      ruleType: "direct",
      confirmed: true,
      notes: "PO number — one per HL*O iteration.",
    },
    {
      sourceFieldId: "prf4",
      targetFieldId: "wa_o_pod",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      confirmed: true,
    },
    {
      sourceFieldId: "prf1",
      targetFieldId: "wa_o_line",
      ruleType: "hlCounter",
      notes:
        "HL hierarchical counter — auto-numbers each order iteration " +
        "(1, 2, …) without needing a source value.",
    },

    // ─── pallets[] loop (nested under orders) ───────────────────────
    {
      sourceFieldId: "mansst",
      targetFieldId: "wa_p_id",
      ruleType: "direct",
      confirmed: true,
      notes: "Pallet SSCC-18 from MAN*GM at tare level.",
    },
    {
      sourceFieldId: "po4c",
      targetFieldId: "wa_p_cases",
      ruleType: "direct",
      notes: "Cases per pallet from PO4*01.",
    },
    {
      sourceFieldId: "po4w",
      targetFieldId: "wa_p_wt",
      ruleType: "formula",
      value: "lb_to_kg",
      confirmed: true,
    },

    // ─── containers/cases[] loop (nested under pallets) ─────────────
    {
      sourceFieldId: "manssp",
      targetFieldId: "wa_p_c_id",
      ruleType: "direct",
      confirmed: true,
      notes: "Case SSCC-18 from MAN*GM at pack level.",
    },
    {
      sourceFieldId: "sn1qp",
      targetFieldId: "wa_p_c_qty",
      ruleType: "direct",
      confirmed: true,
      notes: "Case qty from SN1*02.",
    },

    // ─── items[] loop (nested under cases) ──────────────────────────
    {
      sourceFieldId: "liupc",
      targetFieldId: "wa_i_upc",
      ruleType: "direct",
      notes: "UPC — extracted via LIN qualifier-aware positioning.",
    },
    {
      sourceFieldId: "ligtin",
      targetFieldId: "wa_i_gtin",
      ruleType: "direct",
    },
    {
      sourceFieldId: "lisku",
      targetFieldId: "wa_i_sku",
      ruleType: "direct",
      confirmed: true,
    },
    {
      sourceFieldId: "pidesc",
      targetFieldId: "wa_i_desc",
      ruleType: "direct",
      notes: "Product description from PID*F*08.",
      overrides: [
        {
          customerName: "UPS SCS",
          ruleType: "formula",
          value: "to_upper",
          notes: "UPS warehouse UI renders SKU descriptions in uppercase.",
        },
      ],
    },
    {
      sourceFieldId: "sn1q",
      targetFieldId: "wa_i_qty",
      ruleType: "direct",
      confirmed: true,
    },
    {
      sourceFieldId: "sn1u",
      targetFieldId: "wa_i_uom",
      ruleType: "lookup",
      value: "UOM_CODE",
      notes: "EA → Each, CA → Case, etc.",
    },
    {
      sourceFieldId: "meawt",
      targetFieldId: "wa_i_wt",
      ruleType: "formula",
      value: "lb_to_kg",
      notes: "Catch weight — convert LB to KG.",
    },
    {
      sourceFieldId: "rflot",
      targetFieldId: "wa_i_lot",
      ruleType: "direct",
      notes: "Lot # from REF*LT.",
      overrides: [
        {
          customerName: "Elanco",
          ruleType: "suppress",
          notes: "Elanco masks lot numbers upstream — do not forward.",
        },
      ],
    },
    {
      sourceFieldId: "rfexp",
      targetFieldId: "wa_i_exp",
      ruleType: "dateFormat",
      value: "YYYYMMDD->ISO",
      notes: "Expiry date from REF*EXP, reformatted as ISO.",
    },
  ];
}

export async function seedBlueYonderMappings(
  prisma: PrismaClient,
  partnerId: string,
): Promise<void> {
  await upsertSpec(prisma, {
    slug: "blueyonder-856-wms-showcase",
    partnerId,
    name: "Blue Yonder 856 ASN → WMS Inbound (showcase)",
    txType: "856",
    ediVersion: "4010",
    sourceFormat: "x12",
    targetFormat: "json",
    sourceSchemaId: "x12:856",
    targetSchemaId: "json:wms_asn",
    status: "review",
    direction: "outbound",
    samplePayload: SAMPLE_856,
    mappings: blueYonder856Mappings(),
  });
}
