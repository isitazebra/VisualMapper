/**
 * /demo — public read-only showcase of the mapping studio. Pre-loaded
 * with a realistic Coyote 204 → Internal XML mapping so external
 * visitors can explore the UI without authentication or a database.
 *
 * Loads entirely from the in-code schema registry + hardcoded demo
 * state — zero Prisma queries. Visitors can:
 *  - Browse source/target tree panels
 *  - Click fields to see the rule detail + plain-English explanation
 *  - Expand/collapse groups and loops
 *  - Switch customer overrides (Base / UPS SCS / Kroger)
 *  - View the Live Preview with the pre-loaded sample payload
 *  - Read the Rule Detail panel with override stack
 *
 * They CANNOT:
 *  - Edit rules, add mappings, or delete anything
 *  - Use the AI compose bar
 *  - Create partners / endpoints / runs
 *  - Save any changes (the reducer runs but autosave is disabled)
 */
import { MappingStudio } from "@/components/mapper/MappingStudio";
import type { HydratedMappingSpec } from "@/lib/mappingSpec";
import type { FieldMap, RuleTypeId } from "@/lib/types";
import { getSchemaById } from "@/lib/schemas";

export const metadata = {
  title: "Live Demo — IntegrateOS Mapping Studio",
  description:
    "Explore IntegrateOS's visual EDI mapping studio. Click through a " +
    "real Coyote 204 Load Tender → Internal XML mapping with customer " +
    "overrides, 15 rule types, and a live transform preview.",
};

/** Hardcoded demo mapping — matches the seeded Coyote 204 but lives
 * entirely in code so the demo works without a database connection. */
function buildDemoSpec(): HydratedMappingSpec {
  const maps: FieldMap[] = [
    dm("i06", "tx01", "direct"),
    dm("i08", "tx02", "direct"),
    dm("g02", "tx03", "direct"),
    dm("g03", "tx04", "direct"),
    dm("b202", "tx05", "direct", { ok: true, note: "SCAC — overridden per customer." }),
    ovr("b202", "tx05", "UPS SCS", "hardcode", { v: "UPSN", cond: "ISA*06 = UPSSCNL" }),
    ovr("b202", "tx05", "Kroger", "conditional", { v: "KRGR", cond: "ISA*08 = KRGR" }),
    dm("b204", "tx06", "direct", { ok: true, note: "Shipment ID." }),
    dm("b206", "tx07", "direct"),
    dm("b2a1", "tx08", "direct", { ok: true }),
    dm("b2a2", "tx09", "direct"),
    dm("hl101", "txl11", "direct", { note: "L11 header refs." }),
    dm("hl102", "txl12", "direct"),
    ovr("hl102", "txl12", "UPS SCS", "suppress", { cond: "L11*02 = ZZ" }),
    dm("hl103", "txl13", "direct"),
    dm("nte2", "txn2", "direct"),
    dm("n702", "txe1", "direct", { ok: true }),
    dm("n711", "txe2", "direct"),
    ovr("n711", "txe2", "UPS SCS", "lookup", { v: "EQUIP_TYPE_UPS_PEAK" }),
    dm("n1h1", "txp11", "direct", { ok: true }),
    dm("n1h2", "txp12", "direct"),
    dm("n1h3", "txp13", "direct"),
    dm("n1h4", "txp14", "direct"),
    dm("n3h1", "txp15", "direct"),
    dm("n4h1", "txp16", "direct"),
    dm("n4h2", "txp17", "direct"),
    dm("n4h3", "txp18", "direct"),
    dm("n4h4", "txp19", "direct"),
    dm("s501", "txs11", "direct", { ok: true, note: "Stop sequence #." }),
    dm("s502", "txs12", "direct"),
    dm("sl111", "txs13", "direct"),
    dm("sl112", "txs14", "direct"),
    ovr("sl112", "txs14", "Kroger", "hardcode", { v: "PO", cond: "Always" }),
    dm("sg622", "txs15", "dateFormat", { v: "YYYYMMDD->ISO", note: "Date conversion." }),
    dm("sg624", "txs16", "direct"),
    dm("sa803", "txs17", "direct"),
    dm("sa801", "txs18", "direct"),
    dm("sa805", "txs19", "direct"),
    dm("sn101", "txs1a", "direct"),
    dm("sn102", "txs1b", "direct"),
    dm("sn301", "txs1c", "direct"),
    dm("sn401", "txs1d", "direct"),
    dm("sn402", "txs1e", "direct"),
    dm("sn403", "txs1f", "direct"),
    dm("l301", "txw1", "direct", { ok: true }),
    dm("l303", "txw2", "direct"),
    dm("l305", "txw3", "direct", { ok: true }),
  ];

  return {
    id: "demo",
    partnerId: "demo",
    name: "Coyote 204 Load Tender → Internal XML (demo)",
    txType: "204",
    ediVersion: "4010",
    targetFormat: "xml",
    sourceSchemaId: "x12:204",
    targetSchemaId: "xml:204",
    status: "review",
    samplePayload: SAMPLE_204,
    maps,
  };
}

let _id = 0;
function dm(
  sid: string,
  tid: string,
  rt: RuleTypeId,
  opts?: { v?: string; ok?: boolean; note?: string; cond?: string },
): FieldMap {
  return {
    id: `demo${_id++}`,
    sid,
    tid,
    rt,
    v: opts?.v ?? "",
    co: null,
    cond: opts?.cond ?? "",
    ok: opts?.ok ?? false,
    note: opts?.note ?? "",
  };
}

function ovr(
  sid: string,
  tid: string,
  co: string,
  rt: RuleTypeId,
  opts?: { v?: string; cond?: string },
): FieldMap {
  return {
    id: `demo${_id++}`,
    sid,
    tid,
    rt,
    v: opts?.v ?? "",
    co,
    cond: opts?.cond ?? "",
    ok: false,
    note: "",
  };
}

const SAMPLE_204 = `ISA*00*          *00*          *ZZ*UPSSCNL        *02*CLLQ           *250318*1430*U*00401*000017090*0*P*"~
GS*SM*UPSSCNL*CLLQ*20250318*143000*1709*X*004010~
ST*204*017090001~
B2**CLNL**LD23029450**PP~
B2A*00*LT~
L11*LD23029450*BM*LOAD ID~
NTE**CHECK-IN GATE B~
N7**TRL-4472******TL~
N1*BT*UPS SCS*93*UPSSCSNL~
N3*LUCHTHAVENWEG 57~
N4*EINDHOVEN*NB*5657 EA*NL~
S5*1*CL~
L11*EUNLDELL01*11~
G62*37*20250825**130000~
AT8*G**42500**33~
N1*SH*DELL~
N3*100 DELL WAY~
N4*ROUND ROCK*TX*78682*US~
S5*2*CU~
L11*EUNLDELL02*12~
G62*37*20250830**080000~
AT8*G**38000**28~
N1*CN*MICRON~
N3*200 MICRON WAY~
N4*BOISE*ID*83716*US~
L3*80500*1250.00**1250.00~
SE*24*017090001~
GE*1*1709~
IEA*1*000017090~`;

export default function DemoPage() {
  const sourceDesc = getSchemaById("x12:204") ?? undefined;
  const targetDesc = getSchemaById("xml:204") ?? undefined;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#1d4ed8",
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          textAlign: "center",
          padding: "6px 16px",
          fontFamily: "Karla, sans-serif",
        }}
      >
        You&apos;re viewing a read-only demo of IntegrateOS.{" "}
        <a href="/" style={{ color: "#93c5fd", textDecoration: "underline" }}>
          Go to the full app →
        </a>
      </div>
      <div style={{ paddingTop: 32 }}>
        <MappingStudio
          initialSpec={buildDemoSpec()}
          sourceDescriptor={sourceDesc}
          targetDescriptor={targetDesc}
          readOnly
        />
      </div>
    </>
  );
}
