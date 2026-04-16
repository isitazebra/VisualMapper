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

export const metadata = { title: "Runtime — IntegrateOS Docs" };

export default function RuntimePage() {
  return (
    <>
      <H1>Runtime</H1>
      <P>
        The same transform engine that powers the studio&apos;s live preview
        runs every production transaction. Ingress is HTTP; egress is HTTP
        or none (sync mode). Every inbound payload creates a{" "}
        <C>TransactionRun</C> row with a per-stage event timeline.
      </P>

      <H2 id="endpoints">Endpoints</H2>
      <P>
        An <strong>endpoint</strong> binds an opaque URL token to a mapping
        spec. Create one at{" "}
        <DocLink href="/endpoints/new">/endpoints/new</DocLink>. Mode options:
      </P>
      <UL>
        <li>
          <strong>Sync</strong> — caller POSTs a payload; the response body is
          the transformed output. Used for request/reply integrations.
        </li>
        <li>
          <strong>Forward</strong> — caller POSTs a payload; the endpoint
          transforms it and POSTs the output to an egress URL (with
          configurable headers). Response to the caller is 202 + run id.
        </li>
      </UL>
      <Pre>{`POST /api/ingress/<token>
Content-Type: application/octet-stream

<raw source payload>`}</Pre>

      <H3 id="endpoint-detail">Endpoint detail page</H3>
      <P>
        <C>/endpoints/[id]</C> shows the URL (with copy), current mode, last
        25 runs, and an interactive <strong>Test with sample</strong> panel
        pre-populated with the mapping&apos;s saved sample payload. One click
        to fire a real transaction from the browser.
      </P>

      <H2 id="transactions">Transaction lifecycle</H2>
      <P>
        Each run proceeds through these stages, emitted as{" "}
        <C>TransactionEvent</C> rows:
      </P>
      <OL>
        <li>
          <C>received</C> — payload arrived, size recorded
        </li>
        <li>
          <C>parsed</C> — source parser succeeded; schemas + lookups loaded
        </li>
        <li>
          <C>transformed</C> — rules applied, output generated, mapped /
          skipped counts stored
        </li>
        <li>
          <C>egress_sent</C> — forward mode only, POSTed to egress URL
        </li>
        <li>
          <C>egress_response</C> — forward mode only, receiver&apos;s HTTP status
          + body captured
        </li>
        <li>
          <C>failed</C> — any stage errored; <C>errorStage</C> and{" "}
          <C>errorMessage</C> pinpoint the cause
        </li>
      </OL>
      <P>
        Terminal statuses: <C>delivered</C> (sync success or forward 2xx) or{" "}
        <C>failed</C>. The run detail page renders the timeline with
        elapsed-ms per step.
      </P>

      <H2 id="transaction-stream">Transaction stream</H2>
      <P>
        <C>/runs</C> lists the most recent 100 runs. Filter by status pill
        (All / Delivered / Failed) or search by run id, payload content,
        error message, endpoint name, or partner name. URL-driven so
        queries are shareable.
      </P>

      <H2 id="exceptions">Exception queue</H2>
      <P>
        <C>/exceptions</C> shows unresolved failed runs. Select any
        combination → replay or resolve in bulk. Replays produce new runs
        (originals preserved for comparison); resolving lets you mark runs
        as &quot;fixed&quot; with an optional note.
      </P>

      <H2 id="alerts">Alerts</H2>
      <P>
        Alert rules evaluate after every run completes. Three conditions:
      </P>
      <UL>
        <li>
          <C>error_rate_over</C> — failed/total ≥ threshold (0..1) over the
          window
        </li>
        <li>
          <C>failure_count</C> — failed runs ≥ threshold (absolute count)
        </li>
        <li>
          <C>volume_drop</C> — total runs &lt; threshold (alerts on missing
          traffic)
        </li>
      </UL>
      <P>
        Rules can be scoped to an endpoint, a partner, or global. When a
        rule fires, an <C>AlertEvent</C> is persisted (regardless of webhook
        delivery outcome) and a JSON POST is made to the webhook URL:
      </P>
      <Pre>{`{
  "summary": "Error rate 8.3% ≥ 5% over last 15m (2/24)",
  "condition": "error_rate_over",
  "threshold": 0.05,
  "windowMin": 15,
  "total": 24,
  "failed": 2,
  "endpoint": { "id": "…", "name": "Prod 204" },
  "runId": "…",
  "firedAt": "2025-04-16T14:30:00.000Z"
}`}</Pre>
      <Callout>
        Cooldown: a rule won&apos;t re-fire within its own window, so receivers
        don&apos;t get a notification storm.
      </Callout>

      <H2 id="health">Health dashboard</H2>
      <P>
        <C>/health</C> rolls up per-partner stats over a selectable window
        (1h / 24h / 7d): total volume, error rate, P50 / P95 / avg duration,
        plus a sparkline of hourly volume and the three most recent failures
        for one-click triage.
      </P>

      <H2 id="replay">Replay</H2>
      <P>
        Any run can be replayed against the current mapping from its detail
        page or from the exception queue in bulk. Produces a new run row;
        the original is untouched. Useful after fixing a rule that caused
        past failures.
      </P>
    </>
  );
}
