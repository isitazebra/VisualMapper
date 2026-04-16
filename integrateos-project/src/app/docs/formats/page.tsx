import {
  H1,
  H2,
  H3,
  P,
  UL,
  C,
  Pre,
  Callout,
  DocLink,
} from "@/components/docs/DocsTypography";

export const metadata = { title: "Formats — IntegrateOS Docs" };

export default function FormatsPage() {
  return (
    <>
      <H1>Formats</H1>
      <P>
        Five wire formats are first-class: X12, EDIFACT, JSON, XML, CSV. Each
        has its own parser and emitter under <C>src/lib/transform</C>. This
        page covers the format-specific behavior that matters when authoring
        mappings.
      </P>

      <H2 id="x12">X12</H2>
      <P>
        Standard ASC X12 with the ISA/GS/ST envelope + transaction body.
        Segment terminator <C>~</C>, element separator <C>*</C> (auto-detected
        from ISA*04 when the payload starts with ISA).
      </P>

      <H3 id="x12-seg-notation">Seg notation</H3>
      <P>
        Schema leaves carry a <C>seg</C> string that tells the extractor
        where to find their value. Four forms:
      </P>
      <Pre>{`"B2*04"         // positional — element 4 (0-indexed via elements[3])
"REF*BM"        // scan mode — find "BM" in elements, value is the next element
"PID*F*08"      // explicit position — qualifier "F" at element 0, value at 8
"MEA*PD*WT"     // multi-qualifier — PD at el 0 AND WT at el 1, value at el 2`}</Pre>
      <P>
        The parser heuristic: a trailing 1–2 digit token is a position;
        anything else is a qualifier. A 2-part non-digit form triggers scan
        mode — used for LIN segments where qualifier/value pairs repeat at
        positions 2/3, 4/5, 6/7.
      </P>
      <Callout>
        Display suffixes like <C>&quot; (T)&quot;</C> / <C>&quot; (P)&quot;</C> in a seg are
        stripped by the parser. They exist to disambiguate label text when
        the same segment appears in multiple loops (tare vs. pack).
      </Callout>

      <H3 id="x12-loops">Loops</H3>
      <P>
        Each loop node has a &quot;start tag&quot; — the segment tag of its first leaf
        child. When the extractor sees the start tag, it opens a new
        iteration; segments between start tags are consumed into the current
        iteration. Works recursively — nested loops partition segments within
        their parent iteration.
      </P>
      <P>
        Example with a 204: S5 opens a stop iteration. Segments L11, G62,
        AT8, N1, N3, N4 between two S5 segments belong to the current stop.
        When a new S5 appears, the stop closes and a new one opens.
      </P>

      <H3 id="x12-emission">X12 emission</H3>
      <P>
        Any <C>role: both</C> X12 schema can also be a <em>target</em>. The
        emitter groups leaves by (tag, qualifier-list) and writes one
        segment per group, pinning qualifiers at the leading positions and
        values at their elIdx. Trailing empty elements are trimmed; fully
        empty segments are skipped.
      </P>
      <P>
        Multiple ST/SE pairs within one GS/GE (functional group) become
        multiple transactions — each runs through the engine independently
        and outputs are concatenated with a <C>── transaction N of M ──</C>{" "}
        banner.
      </P>

      <H2 id="edifact">EDIFACT</H2>
      <P>
        UN/EDIFACT — same structural model as X12 (tagged segments with
        positional elements) but different delimiters. Optional <C>UNA</C>{" "}
        service string advice at the top of the payload defines them:
      </P>
      <Pre>{`UNA:+.? '       // colons as component sep, + as element, ' as segment
UNB+UNOC:3+SENDER+RECEIVER+250318:1430+000001'
UNH+1+IFTMIN:D:96B:UN'
BGM+220+REF-123+9'
DTM+137:20250318:102'
UNT+4+1'
UNZ+1+000001'`}</Pre>
      <P>
        Default separators when no UNA is present: <C>+</C> elements, <C>:</C>{" "}
        components, <C>&apos;</C> segments, <C>?</C> release (escape).
      </P>
      <P>
        EDIFACT messages are delimited by UNH/UNT — the analog of X12&apos;s
        ST/SE — so a single interchange can carry multiple messages the same
        way an X12 file can carry multiple transactions.
      </P>

      <H2 id="json">JSON</H2>
      <P>
        Walked with <C>JSON.parse</C>. Objects become groups, arrays become
        loops, primitives become leaves. The outer object is unwrapped — its
        keys are the top-level nodes — so a schema looks natural.
      </P>
      <Pre>{`// Source:
{ "shipmentId": "SH-123", "stops": [{ "city": "Dallas" }, { "city": "Austin" }] }

// Inferred schema:
.shipmentId       (el, sample "SH-123")
.stops[]          (loop, 2 iterations)
  .city           (el, samples "Dallas", "Austin")`}</Pre>

      <H2 id="xml">XML</H2>
      <P>
        Parsed with <C>fast-xml-parser</C>. Elements become groups, repeated
        elements become loops, attributes (<C>@name</C>) become leaves. The
        root element is unwrapped.
      </P>
      <Callout>
        Namespaces are preserved in the element names. Tag-lookup inside
        the emitter uses the last segment of the path so complex targets
        like <C>Loop0100/N1/entityIdentifierCode</C> still emit sensible XML.
      </Callout>

      <H2 id="csv">CSV</H2>
      <P>
        Single-row CSV only. Header row defines field names; the second row
        provides example values for inference. Targets emit one header row
        plus one data row — multi-row CSV targets are a future extension.
      </P>

      <H2 id="custom-schemas">Custom schemas from samples</H2>
      <P>
        For anything that isn&apos;t a built-in, paste a sample at{" "}
        <DocLink href="/schemas/new">/schemas/new</DocLink>. The inference
        engine walks the payload, builds a schema tree, and registers it as
        a custom schema that any mapping can target.
      </P>
      <UL>
        <li><strong>JSON</strong> — arrays → loops, nested objects → groups</li>
        <li><strong>XML</strong> — repeated tags → loops, attributes → leaves</li>
        <li><strong>CSV</strong> — first row = headers, second row = samples</li>
        <li><strong>X12 / EDIFACT</strong> — each unique segment tag becomes a group with its elements as leaves; loop detection is manual (use the built-ins for standard transaction types)</li>
      </UL>
    </>
  );
}
