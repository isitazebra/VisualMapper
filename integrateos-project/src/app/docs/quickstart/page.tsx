import {
  H1,
  H2,
  P,
  OL,
  UL,
  C,
  Pre,
  Callout,
  DocLink,
} from "@/components/docs/DocsTypography";

export const metadata = { title: "Quickstart — IntegrateOS Docs" };

export default function QuickstartPage() {
  return (
    <>
      <H1>Quickstart</H1>
      <P>
        End-to-end in 10 minutes: create a partner, build a mapping against an
        X12 sample, send a real payload through the runtime, and watch the
        transaction land in the stream.
      </P>

      <Callout>
        Prereqs: IntegrateOS deployed on Vercel with a Neon Postgres attached.
        See <DocLink href="/docs/runtime">Runtime</DocLink> for the deployment
        steps.
      </Callout>

      <H2>1. Create a partner</H2>
      <P>
        From the landing page, fill in the <em>New partner</em> form: name,
        type (carrier / customer / 3PL / shipper), optional SCAC. You&apos;ll land
        on the partner workspace.
      </P>

      <H2>2. Create a mapping</H2>
      <P>Two paths:</P>
      <UL>
        <li>
          <strong>X12 preset</strong> — pick a transaction type (204 / 214 /
          856 / etc.), a version (4010 / 5010 / …), and a target format (XML /
          JSON / CSV / X12 / EDIFACT). The source and target schemas are
          resolved from built-ins.
        </li>
        <li>
          <strong>Custom schemas</strong> — pick any registered schema as
          source and any as target, including user-uploaded ones. See{" "}
          <DocLink href="/docs/concepts#custom-schemas">Custom schemas</DocLink>.
        </li>
      </UL>
      <P>
        The studio opens with empty source and target trees alongside an
        empty rule detail panel.
      </P>

      <H2>3. Map fields</H2>
      <P>Three ways to populate a mapping, in increasing order of magic:</P>
      <OL>
        <li>
          <strong>Click-to-map</strong> — click a source leaf, then click a
          target leaf. The studio adds a <C>direct</C> rule between them.
        </li>
        <li>
          <strong>AI fill-in</strong> — click the 🪄 button in the compose
          bar. Claude proposes a mapping for every unmapped target leaf with a
          confidence score. Filter by the threshold slider, accept what you
          want.
        </li>
        <li>
          <strong>AI compose</strong> — type a sentence:{" "}
          <em>
            &quot;For Kroger, hardcode the SCAC to KRGR when ISA*06 is
            UPSSCNL.&quot;
          </em>{" "}
          Claude parses it into a structured override rule with the condition
          baked in.
        </li>
      </OL>

      <H2>4. Test with the live preview</H2>
      <P>
        Switch the bottom panel to the <strong>👁 Live Preview</strong> tab.
        Paste a source payload on the left; the right pane renders the
        transformed output on every keystroke.
      </P>
      <P>
        The preview honors every rule the engine supports — formulas,
        conditionals, aggregations, lookups, loops. The sample payload
        auto-saves per mapping so it sticks across refreshes.
      </P>

      <H2>5. Create a runtime endpoint</H2>
      <P>
        Go to <C>/endpoints/new</C> → pick this partner + mapping → name the
        endpoint → choose <strong>Sync</strong> mode (return output in the
        response) or <strong>Forward</strong> mode (POST output to an egress
        URL). You&apos;ll get an ingress URL:
      </P>
      <Pre>https://your-app.vercel.app/api/ingress/&lt;token&gt;</Pre>

      <H2>6. Send a test payload</H2>
      <P>On the endpoint detail page, the <strong>Test with sample</strong> panel is
        pre-loaded with your mapping&apos;s sample. Click <strong>Send to
        endpoint</strong> — the response appears inline with an HTTP status
        badge, timing, and a link to the run detail.</P>
      <P>Or from a terminal:</P>
      <Pre>
        {`curl -X POST 'https://your-app.vercel.app/api/ingress/<token>' \\
  -H 'Content-Type: application/octet-stream' \\
  --data-binary @sample.edi`}
      </Pre>

      <H2>7. Inspect the run</H2>
      <P>
        <C>/runs</C> shows every transaction; click any row for the full
        lifecycle: input, output, egress response, error details, and a
        per-stage timeline with elapsed-ms timings.
      </P>

      <Callout tone="tip">
        The replay button on run detail re-executes the stored input against
        the current mapping. Useful after fixing a rule that caused a failure.
      </Callout>

      <H2>Next</H2>
      <UL>
        <li>
          <DocLink href="/docs/rule-types">Rule types reference</DocLink> — all
          16 rule types with syntax.
        </li>
        <li>
          <DocLink href="/docs/formats">Formats</DocLink> — how qualified
          segments, loops, and envelopes work per format.
        </li>
        <li>
          <DocLink href="/docs/runtime">Runtime</DocLink> — endpoints, alerts,
          exception queue.
        </li>
      </UL>
    </>
  );
}
