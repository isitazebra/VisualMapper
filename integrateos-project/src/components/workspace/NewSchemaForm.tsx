"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SchemaNode } from "@/lib/types";

type InferFormat = "json" | "xml" | "otm_xml" | "csv" | "x12" | "edifact";
type Role = "source" | "target";

const FORMAT_OPTIONS: Array<{ value: InferFormat; label: string; sample: string }> = [
  {
    value: "json",
    label: "JSON",
    sample:
      '{\n  "shipmentId": "SH-123",\n  "scac": "ABCD",\n  "origin": {\n    "city": "Dallas",\n    "state": "TX"\n  },\n  "stops": [\n    { "seq": 1, "city": "Dallas" },\n    { "seq": 2, "city": "Austin" }\n  ]\n}',
  },
  {
    value: "xml",
    label: "XML",
    sample:
      '<Shipment>\n  <Id>SH-123</Id>\n  <Origin>\n    <City>Dallas</City>\n    <State>TX</State>\n  </Origin>\n  <Stop seq="1"><City>Dallas</City></Stop>\n  <Stop seq="2"><City>Austin</City></Stop>\n</Shipment>',
  },
  { value: "otm_xml", label: "OTM XML", sample: "" },
  {
    value: "csv",
    label: "CSV",
    sample:
      "shipment_id,scac,origin_city,weight\nSH-123,ABCD,Dallas,5000\nSH-124,ABCD,Austin,3200",
  },
  {
    value: "x12",
    label: "X12",
    sample:
      "ISA*00*          *00*          *ZZ*UPSSCNL        *02*CLLQ           *250318*1430*U*00401*000017090*0*P*\"~GS*SM*UPSSCNL*CLLQ*20250318*143000*1709*X*004010~ST*204*017090001~B2*02*CLNL*04*LD23029450*06*PP~L11*01*LD23029450*02*BM~SE*5*017090001~GE*1*1709~IEA*1*000017090~",
  },
  {
    value: "edifact",
    label: "EDIFACT",
    sample:
      "UNA:+.? '\nUNB+UNOC:3+SENDER+RECEIVER+250318:1430+000001'\nUNH+1+IFTMIN:D:96B:UN'\nBGM+220+REF-123+9'\nDTM+137:20250318:102'\nNAD+SH+SENDER+++SENDER NAME++++++US'\nLOC+11+ATL'\nUNT+5+1'\nUNZ+1+000001'",
  },
];

/**
 * Client form: pick format + role, paste sample, preview the inferred
 * node tree, then save. On save we redirect back to /schemas.
 */
export function NewSchemaForm() {
  const router = useRouter();
  const [format, setFormat] = useState<InferFormat>("json");
  const [role, setRole] = useState<Role>("target");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [sample, setSample] = useState(FORMAT_OPTIONS[0].sample);
  const [preview, setPreview] = useState<SchemaNode[] | null>(null);
  const [busy, setBusy] = useState<"idle" | "inferring" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onInfer() {
    setBusy("inferring");
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/schemas/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, sample }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inference failed");
      setPreview(data.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("idle");
    }
  }

  async function onSave() {
    if (!preview || !displayName.trim()) return;
    setBusy("saving");
    setError(null);
    try {
      const res = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          format,
          displayName: displayName.trim(),
          description: description.trim() || null,
          nodes: preview,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      router.push(`/schemas/${encodeURIComponent(saved.id)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy("idle");
    }
  }

  const canSave = !!preview && preview.length > 0 && displayName.trim().length > 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => {
                const next = e.target.value as InferFormat;
                setFormat(next);
                const preset = FORMAT_OPTIONS.find((f) => f.value === next);
                if (preset?.sample && !sample.trim())
                  setSample(preset.sample);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-ink-soft mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
            >
              <option value="source">Source</option>
              <option value="target">Target</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Kroger inbound 850 JSON"
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase text-ink-soft">Sample</label>
            <button
              type="button"
              onClick={() => {
                const preset = FORMAT_OPTIONS.find((f) => f.value === format);
                if (preset?.sample) setSample(preset.sample);
              }}
              className="text-[10px] text-brand-blue hover:underline"
            >
              Load example
            </button>
          </div>
          <textarea
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            rows={12}
            className="w-full rounded border border-border px-2 py-1 text-xs bg-white outline-none focus:border-brand-blue font-mono"
            spellCheck={false}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onInfer}
            disabled={busy !== "idle" || sample.trim().length === 0}
            className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
          >
            {busy === "inferring" ? "Inferring…" : "Preview"}
          </button>
          <button
            onClick={onSave}
            disabled={!canSave || busy !== "idle"}
            className="px-4 py-1.5 rounded bg-brand-green text-white font-semibold text-sm disabled:opacity-50"
            title={
              !displayName.trim()
                ? "Give it a name first"
                : !preview
                  ? "Preview before saving"
                  : undefined
            }
          >
            {busy === "saving" ? "Saving…" : "Save schema"}
          </button>
        </div>
        {error && <div className="text-xs text-brand-red">{error}</div>}
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase text-ink-soft mb-2">Preview</h3>
        {preview === null ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded h-64 flex items-center justify-center">
            Click &ldquo;Preview&rdquo; to see the inferred structure
          </div>
        ) : preview.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
            No fields found. Double-check your sample.
          </div>
        ) : (
          <PreviewTree nodes={preview} />
        )}
      </section>
    </div>
  );
}

function PreviewTree({ nodes }: { nodes: SchemaNode[] }) {
  const topLevel = topLevelOf(nodes);
  return (
    <div className="border border-border rounded bg-paper p-3 text-xs font-mono max-h-[32rem] overflow-y-auto">
      <div className="text-[10px] text-ink-mute mb-2 font-sans not-italic">
        {nodes.length} total node{nodes.length === 1 ? "" : "s"} ·{" "}
        {nodes.filter((n) => n.type === "el").length} leaves ·{" "}
        {nodes.filter((n) => n.type === "loop").length} loops ·{" "}
        {nodes.filter((n) => n.type === "group").length} groups
      </div>
      <ul>
        {topLevel.map((n) => (
          <NodeRow key={n.id} node={n} all={nodes} depth={0} />
        ))}
      </ul>
    </div>
  );
}

function topLevelOf(nodes: SchemaNode[]): SchemaNode[] {
  const childIds = new Set<string>();
  for (const n of nodes) if (n.kids) for (const k of n.kids) childIds.add(k);
  return nodes.filter((n) => !childIds.has(n.id));
}

function NodeRow({
  node,
  all,
  depth,
}: {
  node: SchemaNode;
  all: SchemaNode[];
  depth: number;
}) {
  const kids = (node.kids ?? [])
    .map((id) => all.find((n) => n.id === id))
    .filter((n): n is SchemaNode => !!n);
  return (
    <li style={{ paddingLeft: depth * 14 }} className="py-0.5">
      <span className="inline-flex items-center gap-1.5">
        {node.type === "loop" && (
          <span className="text-[9px] font-bold px-1 rounded bg-brand-amber-soft text-brand-amber">
            LP
          </span>
        )}
        {node.type === "group" && (
          <span className="text-[9px] font-bold px-1 rounded bg-brand-blue-soft text-brand-blue">
            G
          </span>
        )}
        {node.type === "el" && <span className="w-1.5 h-1.5 bg-brand-blue/40 rounded-full" />}
        <span className="text-brand-purple font-semibold">{node.seg}</span>
        <span className="text-ink-soft">— {node.label}</span>
        {node.sample && (
          <span className="text-[10px] text-ink-mute">&nbsp;e.g. &ldquo;{node.sample}&rdquo;</span>
        )}
      </span>
      {kids.length > 0 && (
        <ul>
          {kids.map((k) => (
            <NodeRow key={k.id} node={k} all={all} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
