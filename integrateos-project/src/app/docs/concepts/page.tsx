import {
  H1,
  H2,
  H3,
  P,
  UL,
  OL,
  C,
  Pre,
  Callout,
  DocLink,
} from "@/components/docs/DocsTypography";

export const metadata = { title: "Mapper concepts — IntegrateOS Docs" };

export default function ConceptsPage() {
  return (
    <>
      <H1>Mapper concepts</H1>
      <P>
        The five ideas that drive every mapping: schemas, the rule stack,
        loops, customer overrides, and lookup tables.
      </P>

      <H2 id="schemas">Schemas</H2>
      <P>
        A <strong>schema</strong> is the shape of a payload — a tree of
        fields, groups, and loops with stable ids and human labels. Every
        mapping binds two schemas: one source and one target.
      </P>
      <P>
        Schemas come in two kinds:
      </P>
      <UL>
        <li>
          <strong>Built-in</strong> — defined in code (
          <C>src/lib/schemas</C>). Covers the X12 transaction types
          (204/214/210/990/850/855/856/810), the internal XML target, JSON,
          OTM XML, CSV, and the Blue Yonder WMS ASN shape.
        </li>
        <li>
          <strong>Custom</strong> — inferred from a sample payload via{" "}
          <C>/schemas/new</C>. Paste JSON, XML, CSV, X12, or EDIFACT and the
          platform walks the structure to produce a schema tree. Persisted in
          the <C>Schema</C> Postgres table with scope = global or partner.
        </li>
      </UL>

      <H3 id="custom-schemas">Custom schemas</H3>
      <P>
        Any custom schema becomes a first-class source or target. The{" "}
        <C>json:wms_asn</C> built-in shows the shape — 40 leaves across 5
        nested loops (shipment → orders → pallets → cases → items).
      </P>

      <H2 id="rule-stack">Base rule + override stack</H2>
      <P>
        Each target field gets exactly one <strong>base rule</strong> that
        applies to all transactions by default, plus zero or more{" "}
        <strong>customer-specific overrides</strong>.
      </P>
      <P>
        When the runtime processes a transaction, it picks the
        active-customer override if one exists; otherwise it falls back to
        the base rule. The active customer in the studio is controlled by the
        toolbar dropdown; at runtime it can be derived from a sender id,
        receiver id, or any other heuristic your mapping encodes.
      </P>
      <Callout tone="tip">
        Overrides are the dominant pattern in real DMAs — the same field can
        have 15+ variants depending on who&apos;s involved. The stack is designed
        so the base rule captures the 80% case and overrides capture the
        exceptions.
      </Callout>

      <H2 id="loops">Loops &amp; aggregations</H2>
      <P>
        A <strong>loop</strong> is a schema node whose children can repeat.
        Source loops: X12 HL levels (S/O/T/P/I in an 856 ASN), S5 stops in a
        204, line-item loops in a 210. JSON arrays and repeated XML tags are
        also loops.
      </P>
      <P>
        At extract time, each source loop iteration lives in its own{" "}
        <C>IterationNode</C> with nested sub-loops. The emitter walks the
        target tree with a loop stack and picks iteration counts from the{" "}
        <em>driver</em> source loop — the one whose children are mapped to the
        target loop&apos;s children (majority vote).
      </P>
      <P>
        Aggregation rules fold across every iteration of a source loop:
      </P>
      <UL>
        <li><C>sum</C> / <C>avg</C> / <C>min</C> / <C>max</C> — numeric</li>
        <li><C>count</C> — iteration count (ignores the value)</li>
        <li><C>first</C> / <C>last</C> — first / last non-empty value</li>
      </UL>
      <P>
        Example: <C>aggregate</C> with value <C>count</C> against the source
        leaf <C>mansst</C> (pallet SSCCs) produces the total pallet count
        across every pallet iteration. See{" "}
        <DocLink href="/docs/rule-types#aggregate">aggregate</DocLink>.
      </P>

      <H2 id="customer-overrides">Customer overrides</H2>
      <P>
        An override is a full rule (type + value + optional condition)
        attached to a single customer name. The customer name is free-form —
        typical values are partner identifiers like{" "}
        <C>UPS SCS</C>, <C>Kroger</C>, <C>Elanco</C>.
      </P>
      <P>
        Override evaluation rules:
      </P>
      <OL>
        <li>If no override exists for the active customer, use the base rule.</li>
        <li>If an override exists without a condition, it always wins.</li>
        <li>If an override has a condition (a cross-field predicate), it wins only when the predicate evaluates true against the current payload.</li>
      </OL>

      <H2 id="lookup-tables">Lookup tables</H2>
      <P>
        A <strong>lookup table</strong> is a JSONB key→value map managed at{" "}
        <C>/lookups</C>. Scoped globally or per-partner. The{" "}
        <C>lookup</C> rule type names a table; the source value becomes the
        lookup key, the result becomes the target value.
      </P>
      <P>Example tables seeded out of the box:</P>
      <UL>
        <li>
          <C>X12_SHIPMENT_STATUS</C> — purpose codes (00/05/06/07) → readable
          status
        </li>
        <li>
          <C>X12_TRANSPORT_MODE</C> — TD5*04 codes → Motor / Rail / Air / …
        </li>
        <li>
          <C>UOM_CODE</C> — EA/CA/PL → Each / Case / Pallet
        </li>
        <li>
          <C>ISO_COUNTRY_3</C> — US → USA, CA → CAN, …
        </li>
      </UL>
      <Pre>{`{
  "00": "SHIPPED",
  "05": "REPLACED",
  "06": "CANCELLED",
  "07": "DUPLICATE"
}`}</Pre>
      <Callout>
        Unknown keys pass the source value through unchanged. Unknown table
        names emit <C>⟨lookup:NAME?⟩</C> so you can see which table is
        missing.
      </Callout>

      <H2 id="cross-field-conditionals">Cross-field conditionals</H2>
      <P>
        The <C>conditional</C> rule type evaluates a predicate against the
        payload. The expression grammar:
      </P>
      <UL>
        <li>
          <strong>Operators</strong>: <C>=</C>, <C>!=</C>
        </li>
        <li>
          <strong>Conjunctions</strong>: <C>AND</C>, <C>OR</C> (left-to-right,
          no grouping)
        </li>
        <li>
          <strong>Operands</strong>: source node id (<C>b204</C>), seg (
          <C>ISA*06</C>), <C>&quot;quoted literal&quot;</C>, <C>_</C> for
          &quot;this rule&apos;s own source value&quot;, or an unquoted literal
        </li>
      </UL>
      <Pre>{`ISA*06 = "UPSSCNL" AND ISA*08 = "KRGR"
N1*01 = "BT" OR N1*01 = "ST"
_ != ""`}</Pre>

      <H2 id="next">Next</H2>
      <UL>
        <li>
          <DocLink href="/docs/rule-types">
            Rule types reference
          </DocLink>{" "}
          — every rule type with syntax and examples.
        </li>
        <li>
          <DocLink href="/docs/formats">Formats</DocLink> — format-specific
          parsing / emission details.
        </li>
      </UL>
    </>
  );
}
