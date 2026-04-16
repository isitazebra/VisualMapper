import {
  H1,
  H2,
  H3,
  P,
  C,
  Pre,
  Callout,
  RefTable,
  DocLink,
} from "@/components/docs/DocsTypography";

export const metadata = { title: "API reference — IntegrateOS Docs" };

export default function ApiReferencePage() {
  return (
    <>
      <H1>API reference</H1>
      <P>
        Every REST endpoint IntegrateOS exposes. Bodies are JSON unless
        otherwise noted; responses are JSON with <C>Content-Type:
        application/json</C>. The ingress endpoint is the exception — it
        accepts any raw payload.
      </P>
      <Callout>
        All routes are unauthenticated in V1. Phase 1.2 (partner auth via
        NextAuth magic-link) will add per-user session gating; the ingress
        endpoint will keep token-based access.
      </Callout>

      <H2 id="partners">Partners</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/partners</C>, "List all with mapping counts"],
          [<C key="3">POST</C>, <C key="4">/api/partners</C>, <code key="5" className="text-xs">{`{ name, scac?, type?, status?, contactName?, contactEmail? }`}</code>],
          [<C key="6">GET</C>, <C key="7">/api/partners/[id]</C>, "Single partner with mapping list"],
          [<C key="8">PATCH</C>, <C key="9">/api/partners/[id]</C>, "Update metadata"],
        ]}
      />

      <H2 id="mappings">Mapping specs</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/partners/[id]/mappings</C>, "List specs for a partner"],
          [
            <C key="3">POST</C>,
            <C key="4">/api/partners/[id]/mappings</C>,
            <code key="5" className="text-xs">{`{ txType, ediVersion, targetFormat, sourceSchemaId?, targetSchemaId? }`}</code>,
          ],
          [<C key="6">GET</C>, <C key="7">/api/mappings/[id]</C>, "Full hydrated spec (metadata + fieldMappings + overrides)"],
          [<C key="8">PATCH</C>, <C key="9">/api/mappings/[id]</C>, "Partial update — maps, metadata, samplePayload"],
          [<C key="a">DELETE</C>, <C key="b">/api/mappings/[id]</C>, "Remove spec"],
        ]}
      />
      <P>
        The PATCH endpoint replaces child rows wholesale when <C>maps</C> is
        included — send the full list of FieldMappings + overrides each
        time. When <C>maps</C> is absent, only scalar columns update (used
        for autosaving the sample payload).
      </P>

      <H2 id="schemas">Schemas</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/schemas</C>, "List built-in + custom; ?role=source|target, ?partnerId=…"],
          [
            <C key="3">POST</C>,
            <C key="4">/api/schemas</C>,
            <code key="5" className="text-xs">{`{ role, format, displayName, description?, partnerId?, nodes }`}</code>,
          ],
          [<C key="6">GET</C>, <C key="7">/api/schemas/[id]</C>, "Full descriptor with nodes"],
          [<C key="8">DELETE</C>, <C key="9">/api/schemas/[id]</C>, "Only custom schemas (prefix custom:…)"],
          [
            <C key="a">POST</C>,
            <C key="b">/api/schemas/infer</C>,
            <code key="c" className="text-xs">{`{ format, sample }`}</code>,
          ],
        ]}
      />

      <H2 id="lookups">Lookup tables</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/lookups</C>, "List (summary with entry counts)"],
          [<C key="3">POST</C>, <C key="4">/api/lookups</C>, <code key="5" className="text-xs">{`{ name, description?, partnerId?, entries: {k:v} }`}</code>],
          [<C key="6">GET</C>, <C key="7">/api/lookups/[id]</C>, "Single lookup with full entries map"],
          [<C key="8">PATCH</C>, <C key="9">/api/lookups/[id]</C>, "Partial update"],
          [<C key="a">DELETE</C>, <C key="b">/api/lookups/[id]</C>, "Remove"],
        ]}
      />

      <H2 id="endpoints">Endpoints</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/endpoints</C>, "List; ?partnerId=…"],
          [<C key="3">POST</C>, <C key="4">/api/endpoints</C>, <code key="5" className="text-xs">{`{ partnerId, mappingSpecId, name, mode, egressUrl?, egressHeaders? }`}</code>],
          [<C key="6">GET</C>, <C key="7">/api/endpoints/[id]</C>, "Single endpoint"],
          [<C key="8">PATCH</C>, <C key="9">/api/endpoints/[id]</C>, "Update; set rotateToken:true to regenerate token"],
          [<C key="a">DELETE</C>, <C key="b">/api/endpoints/[id]</C>, "Remove"],
        ]}
      />

      <H2 id="ingress">Ingress (runtime)</H2>
      <P>
        The only endpoint that handles non-JSON bodies. Uses an opaque
        endpoint token in the path to route.
      </P>
      <Pre>{`POST /api/ingress/<token>
Content-Type: application/octet-stream
Body: <raw source payload>

// Sync mode response:
HTTP 200
Content-Type: application/json | application/xml | ...
X-Integrateos-Run-Id: <runId>
Body: <transformed output>

// Forward mode response:
HTTP 202
{ "ok": true, "runId": "…" }

// Failure response:
HTTP 4xx/5xx
{ "ok": false, "runId": "…", "error": "…" }`}</Pre>

      <H2 id="runs">Transaction runs</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [
            <C key="1">GET</C>,
            <C key="2">/api/runs</C>,
            "Summary list. Filters: ?endpointId, ?partnerId, ?status, ?q (search), ?limit",
          ],
          [<C key="3">GET</C>, <C key="4">/api/runs/[id]</C>, "Full detail including payloads + events"],
          [<C key="5">POST</C>, <C key="6">/api/runs/[id]</C>, "Replay against current mapping (produces a new run)"],
          [
            <C key="7">POST</C>,
            <C key="8">/api/runs/bulk</C>,
            <code key="9" className="text-xs">{`{ action: "replay" | "resolve" | "unresolve", ids: [], note? }`}</code>,
          ],
        ]}
      />

      <H2 id="alerts">Alerts</H2>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [<C key="1">GET</C>, <C key="2">/api/alerts</C>, "List rules with recent events"],
          [
            <C key="3">POST</C>,
            <C key="4">/api/alerts</C>,
            <code key="5" className="text-xs">{`{ name, partnerId?, endpointId?, condition, threshold, windowMin, channel: "webhook", webhookUrl }`}</code>,
          ],
          [<C key="6">GET</C>, <C key="7">/api/alerts/[id]</C>, "Single rule with fire history"],
          [<C key="8">PATCH</C>, <C key="9">/api/alerts/[id]</C>, "Update threshold / windowMin / webhookUrl / active"],
          [<C key="a">DELETE</C>, <C key="b">/api/alerts/[id]</C>, "Remove"],
        ]}
      />

      <H2 id="ai">AI endpoints</H2>
      <P>
        Both AI endpoints require <C>ANTHROPIC_API_KEY</C> in the environment.
      </P>
      <RefTable
        headers={["Method", "Path", "Body / purpose"]}
        rows={[
          [
            <C key="1">POST</C>,
            <C key="2">/api/ai/compose-mapping</C>,
            <code key="3" className="text-xs">{`{ mappingId, prompt, maps? }`}</code>,
          ],
          [
            <C key="4">POST</C>,
            <C key="5">/api/ai/auto-map</C>,
            <code key="6" className="text-xs">{`{ mappingId, maps? }`}</code>,
          ],
        ]}
      />
      <P>
        Both return structured <C>AiProposedOperation[]</C> that the studio
        applies via the <C>APPLY_OPS</C> reducer action. Auto-map also
        returns <C>confidence</C> per operation (0–1).
      </P>
    </>
  );
}
