"use client";

import { type Dispatch } from "react";
import type { MapperAction, MapperState, RuleTypeId, SchemaNode } from "@/lib/types";
import { RULE_TYPES, COLORS, ruleNeedsValue } from "@/lib/rules";
import { OverrideStack } from "./OverrideStack";

interface RulePanelProps {
  state: MapperState;
  dispatch: Dispatch<MapperAction>;
  sourceSchema: SchemaNode[];
  targetSchema: SchemaNode[];
}

/**
 * Bottom detail panel. Shows the base rule editor, the override stack, and a
 * side area with notes, sample data, and summary.
 */
export function RulePanel({ state, dispatch, sourceSchema, targetSchema }: RulePanelProps) {
  const selected = state.selMap ? state.maps.find((m) => m.id === state.selMap) : null;

  if (!selected) {
    return (
      <div style={{ padding: 12, textAlign: "center", color: COLORS.t3, fontSize: 10 }}>
        Click source field → target field to map
      </div>
    );
  }

  const sourceNode = sourceSchema.find((n) => n.id === selected.sid);
  const targetNode = targetSchema.find((n) => n.id === selected.tid);
  const baseMap = state.maps.find(
    (m) => m.sid === selected.sid && m.tid === selected.tid && !m.co,
  );
  const overrides = state.maps.filter(
    (m) => m.sid === selected.sid && m.tid === selected.tid && m.co,
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Main rule editor */}
      <div
        style={{
          flex: 1,
          padding: "6px 10px",
          overflowY: "auto",
          borderRight: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>
          {sourceNode?.seg} <span style={{ color: COLORS.blue }}>→</span> {targetNode?.seg}
        </div>
        <div style={{ fontSize: 8, color: COLORS.t3, marginBottom: 6 }}>
          {sourceNode?.label} → {targetNode?.label}
        </div>

        <div
          style={{
            background: COLORS.blueSoft,
            border: `1px solid ${COLORS.blue}22`,
            borderRadius: 4,
            padding: 6,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 7,
              fontWeight: 700,
              color: COLORS.blue,
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            Base Rule
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 3 }}>
            <select
              value={baseMap?.rt ?? "direct"}
              onChange={(e) =>
                baseMap &&
                dispatch({ type: "UPD", id: baseMap.id, u: { rt: e.target.value as RuleTypeId } })
              }
              style={{
                padding: "1px 3px",
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                fontSize: 8,
                background: COLORS.white,
                cursor: "pointer",
              }}
            >
              {Object.entries(RULE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
            {baseMap && ruleNeedsValue(baseMap.rt) && (
              <input
                value={baseMap.v}
                onChange={(e) => dispatch({ type: "UPD", id: baseMap.id, u: { v: e.target.value } })}
                placeholder="Value..."
                style={{
                  flex: 1,
                  padding: "1px 4px",
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 8,
                  fontFamily: "'Fira Code', monospace",
                  outline: "none",
                  background: COLORS.white,
                }}
              />
            )}
          </div>
          {baseMap && (
            <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={() => dispatch({ type: "UPD", id: baseMap.id, u: { ok: !baseMap.ok } })}
                style={{
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 7,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${baseMap.ok ? COLORS.greenBorder : COLORS.border}`,
                  background: baseMap.ok ? COLORS.greenSoft : COLORS.white,
                  color: baseMap.ok ? COLORS.green : COLORS.blue,
                }}
              >
                {baseMap.ok ? "✓ Done" : "Confirm"}
              </button>
              <button
                onClick={() => dispatch({ type: "DEL", id: baseMap.id })}
                style={{
                  padding: "1px 4px",
                  borderRadius: 3,
                  fontSize: 7,
                  cursor: "pointer",
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.white,
                  color: COLORS.red,
                }}
              >
                Del
              </button>
            </div>
          )}
        </div>

        <OverrideStack
          baseMap={baseMap}
          overrides={overrides}
          selMap={state.selMap}
          dispatch={dispatch}
        />
      </div>

      {/* Sidebar: notes, sample, summary */}
      <div style={{ width: 160, padding: "6px 8px", background: COLORS.cream, overflowY: "auto" }}>
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: COLORS.t3,
            marginBottom: 3,
            textTransform: "uppercase",
          }}
        >
          Notes
        </div>
        <textarea
          value={selected.note}
          onChange={(e) => dispatch({ type: "UPD", id: selected.id, u: { note: e.target.value } })}
          placeholder="Notes..."
          style={{
            width: "100%",
            height: 40,
            padding: 3,
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            fontSize: 7,
            fontFamily: "Karla, sans-serif",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: COLORS.t3,
            marginTop: 6,
            marginBottom: 2,
            textTransform: "uppercase",
          }}
        >
          Sample
        </div>
        <div
          style={{
            fontSize: 7,
            fontFamily: "'Fira Code', monospace",
            color: COLORS.tx,
            background: COLORS.white,
            padding: 3,
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            wordBreak: "break-all",
          }}
        >
          {sourceNode?.sample ?? "—"}
        </div>
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: COLORS.t3,
            marginTop: 6,
            marginBottom: 2,
            textTransform: "uppercase",
          }}
        >
          Summary
        </div>
        <div style={{ fontSize: 7, lineHeight: 1.4 }}>
          <div>
            <b>Base:</b> {baseMap ? RULE_TYPES[baseMap.rt].label : "—"}{" "}
            {baseMap?.v && `"${baseMap.v}"`}
          </div>
          {overrides.map((o) => (
            <div key={o.id} style={{ color: COLORS.orange }}>
              <b>{o.co?.split(" ")[0]}:</b> {RULE_TYPES[o.rt].label} {o.v && `"${o.v}"`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
