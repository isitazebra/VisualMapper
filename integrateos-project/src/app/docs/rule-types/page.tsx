import {
  H1,
  H2,
  P,
  C,
  Pre,
  RefTable,
  DocLink,
  Callout,
} from "@/components/docs/DocsTypography";

export const metadata = { title: "Rule types — IntegrateOS Docs" };

export default function RuleTypesPage() {
  return (
    <>
      <H1>Rule types</H1>
      <P>
        Every rule type the transform engine executes, with its value syntax
        and a concrete example. The studio&apos;s plain-English explainer
        generates prose from these rules deterministically — the AI compose
        flow (<DocLink href="/docs/concepts#custom-schemas">3.2</DocLink>)
        emits the same grammar.
      </P>

      <Callout>
        Rules without a value field (<C>direct</C>, <C>passthrough</C>,{" "}
        <C>suppress</C>, <C>currentDate</C>, <C>currentTime</C>) are called
        <em> valueless</em> and hide the input in the UI.
      </Callout>

      <H2 id="direct">direct</H2>
      <P>Copy the source value to the target unchanged.</P>
      <Pre>{`source = "LD23029450"  →  target = "LD23029450"`}</Pre>

      <H2 id="passthrough">passthrough</H2>
      <P>
        Identical behavior to <C>direct</C>. The separate type exists so the
        mapper can distinguish &quot;copied by intent&quot; (passthrough) from
        &quot;copied by default&quot; (direct) in explanations and exports.
      </P>

      <H2 id="hardcode">hardcode</H2>
      <P>Always emit the literal value, ignoring the source.</P>
      <Pre>{`rule.value = "KRGR"
output = "KRGR"`}</Pre>

      <H2 id="suppress">suppress</H2>
      <P>
        Omit the target field entirely from the output. Different from
        emitting an empty string — the key/element isn&apos;t written at all.
      </P>

      <H2 id="currentDate">currentDate</H2>
      <P>
        ISO date at transform time (<C>YYYY-MM-DD</C>). Useful for stamping{" "}
        <C>receivedAt</C> or similar audit fields. No input, no value needed.
      </P>

      <H2 id="currentTime">currentTime</H2>
      <P>ISO time at transform time (<C>HH:MM:SS</C>).</P>

      <H2 id="autoIncrement">autoIncrement</H2>
      <P>
        Integer counter, starting at 1 and incrementing each time the rule
        fires within a single transform run. Counter state is shared across
        every iteration of every loop.
      </P>

      <H2 id="hlCounter">hlCounter</H2>
      <P>
        Hierarchical-level counter — auto-numbers each iteration a
        containing loop emits. In the Blue Yonder 856 showcase, the{" "}
        <C>orderLineNumber</C> target uses <C>hlCounter</C> and counts
        1, 2, 3… as orders loop.
      </P>

      <H2 id="concat">concat</H2>
      <P>
        String concatenation. Two modes based on whether the value contains{" "}
        <C>{"{"}id{"}"}</C> placeholders:
      </P>
      <RefTable
        headers={["Mode", "When", "Behavior"]}
        rows={[
          [<C key="s">suffix</C>, "value is plain text", "emits source + value"],
          [
            <C key="t">template</C>,
            <>value contains <C>{"{id}"}</C> placeholders</>,
            <>substitute each <C>{"{id}"}</C> with the source value of that node id; <C>{"{_}"}</C> means this rule&apos;s own source</>,
          ],
        ]}
      />
      <Pre>{`// suffix mode
value = " [supplier]"
output = "AIT Dallas DC [supplier]"

// template mode
value = "{_} • {td303}"
output = "ODFL • TRL-44872"`}</Pre>

      <H2 id="splitField">splitField</H2>
      <P>
        Substring extraction. Value is <C>start,end</C> or <C>start</C>, each
        with optional negative indexes (count from end).
      </P>
      <RefTable
        headers={["value", "source", "output"]}
        rows={[
          [<C key="1">&quot;0,5&quot;</C>, <C key="2">&quot;37201-0847&quot;</C>, <C key="3">&quot;37201&quot;</C>],
          [<C key="4">&quot;-4&quot;</C>, <C key="5">&quot;SHP-99841&quot;</C>, <C key="6">&quot;9841&quot;</C>],
          [<C key="7">&quot;2,-1&quot;</C>, <C key="8">&quot;LD23029450&quot;</C>, <C key="9">&quot;2302945&quot;</C>],
        ]}
      />

      <H2 id="dateFormat">dateFormat</H2>
      <P>
        Date parse + reformat. Value is <C>&quot;FROM-&gt;TO&quot;</C> where both sides
        use tokens <C>YYYY</C>, <C>YY</C>, <C>MM</C>, <C>DD</C>, <C>HH</C>,{" "}
        <C>mm</C>, <C>ss</C>. <C>ISO</C> on the right emits ISO 8601.
      </P>
      <RefTable
        headers={["value", "source", "output"]}
        rows={[
          [<C key="1">&quot;YYYYMMDD-&gt;ISO&quot;</C>, <C key="2">&quot;20250318&quot;</C>, <C key="3">&quot;2025-03-18&quot;</C>],
          [<C key="4">&quot;YYMMDD-&gt;MM/DD/YYYY&quot;</C>, <C key="5">&quot;250318&quot;</C>, <C key="6">&quot;03/18/2025&quot;</C>],
          [<C key="7">&quot;YYYYMMDDHHmm-&gt;ISO&quot;</C>, <C key="8">&quot;202503181430&quot;</C>, <C key="9">&quot;2025-03-18T14:30:00&quot;</C>],
        ]}
      />
      <Callout>
        Two-digit years auto-window: <C>YY &lt; 50</C> → 20xx, <C>≥ 50</C> → 19xx.
      </Callout>

      <H2 id="formula">formula</H2>
      <P>
        Named transform. Value is the formula name; 14 built-ins cover common
        DMA transforms.
      </P>
      <RefTable
        headers={["formula", "behavior"]}
        rows={[
          [<C key="c2d">cents_to_dollars</C>, "157408 → 1574.08"],
          [<C key="d2c">dollars_to_cents</C>, "1574.08 → 157408"],
          [<C key="up">to_upper / to_lower / title_case</C>, "case normalization"],
          [<C key="t">trim</C>, "whitespace trim"],
          [<C key="do">digits_only</C>, "abc-123 → 123"],
          [<C key="lz">strip_leading_zeros</C>, "00123 → 123"],
          [<C key="fw">first_word / last_word</C>, "split on whitespace"],
          [<C key="c23">country_2to3 / country_3to2</C>, "US ↔ USA (50+ ISO codes)"],
          [<C key="lb">lb_to_kg / kg_to_lb</C>, "pounds ↔ kilograms"],
          [<C key="in">in_to_cm / cm_to_in</C>, "inches ↔ centimeters"],
          [<C key="ea">to_each_count</C>, "&ldquo;5 CA&rdquo; → 60 (cases × 12)"],
        ]}
      />

      <H2 id="lookup">lookup</H2>
      <P>
        Named lookup-table translation. Value is the table name; the source
        value is the key. Unknown keys pass the source through unchanged;
        unknown table names emit <C>⟨lookup:NAME?⟩</C>.
      </P>
      <Pre>{`// Table X12_SHIPMENT_STATUS:  {"00": "SHIPPED", "05": "REPLACED", ...}
rule.value = "X12_SHIPMENT_STATUS"
source = "00"
output = "SHIPPED"`}</Pre>
      <P>
        Manage tables at <DocLink href="/lookups">/lookups</DocLink>. See{" "}
        <DocLink href="/docs/concepts#lookup-tables">Concepts</DocLink>.
      </P>

      <H2 id="parseXml">parseXml</H2>
      <P>
        Extract a value from inside an XML-shaped source string. Value is a
        tag path; <C>@name</C> pulls an attribute.
      </P>
      <Pre>{`source = "<Foo><Bar>42</Bar></Foo>"
rule.value = "Foo/Bar"
output = "42"`}</Pre>

      <H2 id="conditional">conditional</H2>
      <P>
        Cross-field predicate. Value is the output when the condition holds;
        when it fails, the source passes through unchanged.
      </P>
      <Pre>{`condition = "ISA*06 = UPSSCNL AND ISA*08 = KRGR"
value = "KRDC847"
// If both sides match on the current payload → emit "KRDC847".
// Otherwise the source value (ISA*08 here) passes through.`}</Pre>
      <P>See <DocLink href="/docs/concepts#cross-field-conditionals">Cross-field conditionals</DocLink> for the full grammar.</P>

      <H2 id="aggregate">aggregate</H2>
      <P>
        Fold across every iteration of a source loop. The rule&apos;s{" "}
        <C>sourceFieldId</C> should point at a leaf <em>inside</em> a loop;
        the value names the fold operation.
      </P>
      <RefTable
        headers={["value", "behavior"]}
        rows={[
          [<C key="s">sum</C>, "sum of numeric values across iterations"],
          [<C key="a">avg</C>, "arithmetic mean"],
          [<C key="mn">min</C>, "smallest value"],
          [<C key="mx">max</C>, "largest value"],
          [<C key="c">count</C>, "iteration count (ignores the value)"],
          [<C key="f">first</C>, "first non-empty value"],
          [<C key="l">last</C>, "last non-empty value"],
        ]}
      />
      <Pre>{`// Blue Yonder 856 showcase:
// rule.sourceFieldId = "mansst" (pallet SSCC, inside HL-T loop)
// rule.value = "count"
// → output = 4 (total pallets across all orders)`}</Pre>
    </>
  );
}
