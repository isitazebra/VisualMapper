"use client";

import { type Dispatch, useMemo, useState } from "react";
import type {
  AiProposedOperation,
  FieldMap,
  MapperAction,
  SchemaNode,
} from "@/lib/types";
import { COLORS, FONT_MONO, FONT_SANS, RULE_TYPES } from "@/lib/rules";
import { explainRule } from "@/lib/explain";

interface ComposeBarProps {
  mappingId: string;
  dispatch: Dispatch<MapperAction>;
  sourceNodes: SchemaNode[];
  targetNodes: SchemaNode[];
  currentMaps: FieldMap[];
}

type BusyState = "idle" | "composing" | "filling" | "applying";

interface Proposal {
  kind: "compose" | "fill";
  operations: AiProposedOperation[];
  /** Top-level reasoning (compose only — fill has per-op reasoning). */
  reasoning?: string;
  usage: { inputTokens: number; outputTokens: number };
}

interface ComposeResponse {
  ok: true;
  operations: AiProposedOperation[];
  reasoning: string;
  userPrompt: string;
  usage: { inputTokens: number; outputTokens: number };
}

interface FillResponse {
  ok: true;
  operations: AiProposedOperation[];
  usage: { inputTokens: number; outputTokens: number };
}

interface ApiError {
  ok: false;
  error: string;
}

/**
 * Plain-English compose bar. Two modes:
 *   - Compose: user types a sentence, Claude turns it into ops
 *   - AI fill-in: Claude proposes mappings for every unmapped target,
 *     each with a confidence score. A slider filters by minimum
 *     confidence before apply.
 *
 * Both flows use the same proposal card and the same APPLY_OPS reducer
 * action, so the code path is consistent.
 */
export function ComposeBar({
  mappingId,
  dispatch,
  sourceNodes,
  targetNodes,
  currentMaps,
}: ComposeBarProps) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [minConfidence, setMinConfidence] = useState(0.6);

  const sourceById = useMemo(
    () => new Map(sourceNodes.map((n) => [n.id, n])),
    [sourceNodes],
  );
  const targetById = useMemo(
    () => new Map(targetNodes.map((n) => [n.id, n])),
    [targetNodes],
  );

  async function onCompose() {
    const text = prompt.trim();
    if (!text) return;
    setBusy("composing");
    setError(null);
    setProposal(null);
    try {
      const res = await fetch("/api/ai/compose-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, prompt: text, maps: currentMaps }),
      });
      const data: ComposeResponse | ApiError = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error((data as ApiError).error ?? `HTTP ${res.status}`);
      }
      setProposal({
        kind: "compose",
        operations: data.operations,
        reasoning: data.reasoning,
        usage: data.usage,
      });
      setSelected(new Set(data.operations.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("idle");
    }
  }

  async function onFill() {
    setBusy("filling");
    setError(null);
    setProposal(null);
    try {
      const res = await fetch("/api/ai/auto-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, maps: currentMaps }),
      });
      const data: FillResponse | ApiError = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error((data as ApiError).error ?? `HTTP ${res.status}`);
      }
      setProposal({
        kind: "fill",
        operations: data.operations,
        usage: data.usage,
      });
      // Pre-select ops at or above the default confidence threshold.
      setSelected(
        new Set(
          data.operations
            .map((op, i) => ({ op, i }))
            .filter(({ op }) => (op.confidence ?? 0) >= minConfidence)
            .map(({ i }) => i),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("idle");
    }
  }

  function onApply() {
    if (!proposal) return;
    const ops = proposal.operations.filter((_, i) => selected.has(i));
    if (ops.length === 0) return;
    setBusy("applying");
    dispatch({ type: "APPLY_OPS", ops });
    setProposal(null);
    setPrompt("");
    setBusy("idle");
  }

  function onThresholdChange(next: number) {
    setMinConfidence(next);
    if (proposal?.kind === "fill") {
      setSelected(
        new Set(
          proposal.operations
            .map((op, i) => ({ op, i }))
            .filter(({ op }) => (op.confidence ?? 0) >= next)
            .map(({ i }) => i),
        ),
      );
    }
  }

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  return (
    <div
      style={{
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.paper,
        padding: "4px 8px",
      }}
    >
      <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: COLORS.blue,
            padding: "4px 0",
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontFamily: FONT_SANS,
          }}
        >
          ✨ Tell me what to do:
        </div>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCompose();
            }
          }}
          placeholder='e.g. "Put the shipment ID in target, but for Kroger hardcode KRGR"'
          disabled={busy !== "idle"}
          style={{
            flex: 1,
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            fontSize: 11,
            fontFamily: FONT_SANS,
            outline: "none",
            background: COLORS.white,
            color: COLORS.tx,
            opacity: busy === "composing" ? 0.6 : 1,
          }}
        />
        <button
          onClick={onCompose}
          disabled={busy !== "idle" || prompt.trim().length === 0}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "none",
            background: COLORS.blue,
            color: COLORS.white,
            cursor: busy === "idle" && prompt.trim().length > 0 ? "pointer" : "default",
            fontSize: 10,
            fontWeight: 700,
            opacity: busy === "idle" && prompt.trim().length > 0 ? 1 : 0.5,
            fontFamily: FONT_SANS,
            flexShrink: 0,
          }}
        >
          {busy === "composing" ? "Composing…" : "Compose"}
        </button>
        <button
          onClick={onFill}
          disabled={busy !== "idle"}
          title="Ask Claude to map every unmapped target field"
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: `1px solid ${COLORS.purple}`,
            background: COLORS.purpleSoft,
            color: COLORS.purple,
            cursor: busy === "idle" ? "pointer" : "default",
            fontSize: 10,
            fontWeight: 700,
            opacity: busy === "idle" ? 1 : 0.5,
            fontFamily: FONT_SANS,
            flexShrink: 0,
          }}
        >
          {busy === "filling" ? "Filling…" : "🪄 AI fill-in"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 4,
            padding: "4px 8px",
            background: "#fff1f0",
            border: `1px solid ${COLORS.red}44`,
            borderRadius: 3,
            fontSize: 10,
            color: COLORS.red,
          }}
        >
          {error}
        </div>
      )}

      {proposal && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 8px",
            background: COLORS.blueSoft,
            border: `1px solid ${COLORS.blue}22`,
            borderRadius: 4,
          }}
        >
          {proposal.reasoning && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.t2,
                marginBottom: 4,
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              💡 {proposal.reasoning}
            </div>
          )}

          {proposal.kind === "fill" && proposal.operations.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 4,
                padding: "3px 5px",
                background: COLORS.white,
                borderRadius: 3,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.t2 }}>
                Min confidence:
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={minConfidence}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                style={{ flex: 1, minWidth: 100 }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: FONT_MONO,
                  fontWeight: 700,
                  color: confColor(minConfidence),
                  minWidth: 28,
                  textAlign: "right",
                }}
              >
                {(minConfidence * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 9, color: COLORS.t3 }}>
                ({selected.size}/{proposal.operations.length} selected)
              </span>
            </div>
          )}

          {proposal.operations.length === 0 ? (
            <div style={{ fontSize: 10, color: COLORS.t3 }}>
              {proposal.kind === "fill"
                ? "No new mappings proposed — everything may already be mapped."
                : "No operations proposed. Try rephrasing."}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                maxHeight: proposal.kind === "fill" ? 240 : undefined,
                overflowY: proposal.kind === "fill" ? "auto" : undefined,
              }}
            >
              {proposal.operations.map((op, i) => {
                const src = sourceById.get(op.sourceFieldId);
                const tgt = targetById.get(op.targetFieldId);
                const conf = op.confidence;
                return (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      gap: 5,
                      alignItems: "flex-start",
                      padding: "3px 5px",
                      background: selected.has(i) ? COLORS.white : "transparent",
                      borderRadius: 3,
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 9,
                          fontFamily: FONT_MONO,
                          color: COLORS.t3,
                          marginBottom: 1,
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: COLORS.blue, fontWeight: 700 }}>
                          {src?.seg ?? op.sourceFieldId}
                        </span>
                        <span>→</span>
                        <span style={{ color: COLORS.purple, fontWeight: 700 }}>
                          {tgt?.seg ?? op.targetFieldId}
                        </span>
                        {conf !== undefined && (
                          <span
                            style={{
                              padding: "0 4px",
                              borderRadius: 2,
                              background: confBg(conf),
                              color: confColor(conf),
                              fontWeight: 700,
                              marginLeft: "auto",
                            }}
                          >
                            {(conf * 100).toFixed(0)}%
                          </span>
                        )}
                        {!src && (
                          <span style={{ color: COLORS.red }}>
                            (unknown source)
                          </span>
                        )}
                        {!tgt && (
                          <span style={{ color: COLORS.red }}>
                            (unknown target)
                          </span>
                        )}
                      </div>
                      <div style={{ color: COLORS.tx, lineHeight: 1.4 }}>
                        {explainRule(
                          {
                            id: "preview",
                            sid: op.sourceFieldId,
                            tid: op.targetFieldId,
                            rt: op.ruleType,
                            v: op.value ?? "",
                            co: null,
                            cond: op.condition ?? "",
                            ok: false,
                            note: op.notes ?? "",
                          },
                          src?.seg ?? op.sourceFieldId,
                          tgt?.seg ?? op.targetFieldId,
                        )}
                      </div>
                      {op.aiReasoning && (
                        <div
                          style={{
                            fontSize: 9,
                            color: COLORS.t3,
                            fontStyle: "italic",
                            marginTop: 1,
                          }}
                        >
                          {op.aiReasoning}
                        </div>
                      )}
                      {op.overrides?.map((o, oi) => (
                        <div
                          key={oi}
                          style={{
                            fontSize: 9.5,
                            color: COLORS.orange,
                            marginTop: 1,
                            lineHeight: 1.4,
                          }}
                        >
                          ↳ For {o.customerName}:{" "}
                          {RULE_TYPES[o.ruleType]?.label ?? o.ruleType}
                          {o.value ? ` "${o.value}"` : ""}
                          {o.condition ? ` when ${o.condition}` : ""}
                        </div>
                      ))}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 4,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 8, color: COLORS.t3, fontFamily: FONT_MONO }}>
              {proposal.usage.inputTokens} in / {proposal.usage.outputTokens} out tokens
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => {
                  setProposal(null);
                  setSelected(new Set());
                }}
                style={{
                  padding: "3px 10px",
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.white,
                  cursor: "pointer",
                  fontSize: 10,
                  fontFamily: FONT_SANS,
                }}
              >
                Discard
              </button>
              <button
                onClick={onApply}
                disabled={selected.size === 0 || busy !== "idle"}
                style={{
                  padding: "3px 10px",
                  borderRadius: 3,
                  border: "none",
                  background: COLORS.green,
                  color: COLORS.white,
                  cursor: selected.size > 0 ? "pointer" : "default",
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: selected.size > 0 ? 1 : 0.5,
                  fontFamily: FONT_SANS,
                }}
              >
                Apply {selected.size}/{proposal.operations.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Color coding for the confidence badge + threshold readout. */
function confColor(c: number): string {
  if (c >= 0.8) return COLORS.green;
  if (c >= 0.5) return COLORS.amber;
  return COLORS.red;
}

function confBg(c: number): string {
  if (c >= 0.8) return COLORS.greenSoft;
  if (c >= 0.5) return COLORS.amberSoft;
  return "#fff1f0";
}
