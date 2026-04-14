"use client";

import { type Dispatch, useMemo } from "react";
import type { MapperAction, MapperState, SchemaNode } from "@/lib/types";
import { isVisible } from "@/lib/mapperState";
import { COLORS } from "@/lib/rules";
import { TreeRow } from "./TreeRow";

interface TreePanelProps {
  side: "s" | "t";
  schema: SchemaNode[];
  state: MapperState;
  dispatch: Dispatch<MapperAction>;
  header: {
    badge: string;
    badgeColor: "blue" | "purple";
    title: string;
  };
  columns: { segment: string; description: string; third?: string };
  /** The opposite schema — needed so the source-side row can render the mapped target segment. */
  otherSchema: SchemaNode[];
}

/** Left/right tree column — header strip, column labels, scrollable row list. */
export function TreePanel({
  side,
  schema,
  state,
  dispatch,
  header,
  columns,
  otherSchema,
}: TreePanelProps) {
  const visible = useMemo(
    () => schema.filter((n) => isVisible(n, schema, state.collapsed)),
    [schema, state.collapsed],
  );
  const leafCount = schema.filter((n) => n.type === "el").length;

  const badgeBg = header.badgeColor === "blue" ? COLORS.blueSoft : COLORS.purpleSoft;
  const badgeFg = header.badgeColor === "blue" ? COLORS.blue : COLORS.purple;
  const gridTemplate = columns.third
    ? "minmax(130px,2fr) 1.1fr 0.5fr"
    : "minmax(130px,2fr) 1.1fr";

  const targetSchema = side === "s" ? otherSchema : schema;

  return (
    <div
      style={{
        flex: 1,
        borderRight: side === "s" ? `2px solid ${COLORS.bHard}` : undefined,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "3px 5px",
          background: COLORS.cream,
          borderBottom: `1px solid ${COLORS.bHard}`,
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontWeight: 800,
            padding: "0 3px",
            borderRadius: 2,
            background: badgeBg,
            color: badgeFg,
            fontFamily: "'Fira Code', monospace",
          }}
        >
          {header.badge}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700 }}>{header.title}</span>
        <span style={{ fontSize: 7, color: COLORS.t3, marginLeft: "auto" }}>{leafCount} fld</span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridTemplate,
          background: COLORS.cream,
          borderBottom: `1px solid ${COLORS.bHard}`,
          fontSize: 7,
          fontWeight: 700,
          color: COLORS.t3,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "2px 4px", borderRight: `1px solid ${COLORS.border}` }}>
          {columns.segment}
        </div>
        <div
          style={{
            padding: "2px 4px",
            borderRight: columns.third ? `1px solid ${COLORS.border}` : "none",
          }}
        >
          {columns.description}
        </div>
        {columns.third && <div style={{ padding: "2px 4px" }}>{columns.third}</div>}
      </div>

      {/* Scrollable rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {visible.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            side={side}
            state={state}
            dispatch={dispatch}
            targetSchema={targetSchema}
          />
        ))}
      </div>
    </div>
  );
}
