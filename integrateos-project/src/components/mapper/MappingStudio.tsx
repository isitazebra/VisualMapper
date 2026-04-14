"use client";

import { useMemo, useReducer } from "react";
import { COLORS, FONT_SANS } from "@/lib/rules";
import { initialMapperState, mapperReducer } from "@/lib/mapperState";
import { getSourceSchema, getTargetSchema, TX_LABELS, FMT_LABELS } from "@/lib/schemas";
import { MapperToolbar } from "./MapperToolbar";
import { TreePanel } from "./TreePanel";
import { RulePanel } from "./RulePanel";

/** Top-level mapping studio — orchestrates state and the three panels. */
export function MappingStudio() {
  const [state, dispatch] = useReducer(mapperReducer, initialMapperState);

  const sourceSchema = useMemo(() => getSourceSchema(state.tx), [state.tx]);
  const targetSchema = useMemo(() => getTargetSchema(state.tx, state.fmt), [state.tx, state.fmt]);

  const baseMaps = state.maps.filter((m) => !m.co);
  const stats = {
    total: baseMaps.length,
    ok: baseMaps.filter((m) => m.ok).length,
    overrides: state.maps.filter((m) => m.co).length,
  };

  const targetBadge = state.fmt === "json" ? "{}" : state.fmt === "csv" ? "CSV" : "XML";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: COLORS.bg,
        fontFamily: FONT_SANS,
        color: COLORS.tx,
      }}
    >
      <MapperToolbar state={state} dispatch={dispatch} stats={stats} />

      {/* Two tree panels side by side */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <TreePanel
          side="s"
          schema={sourceSchema}
          otherSchema={targetSchema}
          state={state}
          dispatch={dispatch}
          header={{
            badge: `X12 ${state.ver}`,
            badgeColor: "blue",
            title: TX_LABELS[state.tx],
          }}
          columns={{ segment: "Segment", description: "Description", third: "Sample" }}
        />
        <TreePanel
          side="t"
          schema={targetSchema}
          otherSchema={sourceSchema}
          state={state}
          dispatch={dispatch}
          header={{
            badge: targetBadge,
            badgeColor: "purple",
            title: FMT_LABELS[state.fmt],
          }}
          columns={{ segment: "Field / Path", description: "Description" }}
        />
      </div>

      {/* Bottom rule detail */}
      <div
        style={{
          height: 180,
          borderTop: `2px solid ${COLORS.bHard}`,
          background: COLORS.paper,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "3px 8px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.cream,
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          📐 Rule Detail
        </div>
        <div style={{ height: "calc(100% - 22px)" }}>
          <RulePanel
            state={state}
            dispatch={dispatch}
            sourceSchema={sourceSchema}
            targetSchema={targetSchema}
          />
        </div>
      </div>
    </div>
  );
}
