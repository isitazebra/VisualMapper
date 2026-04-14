"use client";

import { type Dispatch } from "react";
import { COLORS, FONT_MONO, RULE_TYPES } from "@/lib/rules";
import type { MapperAction, MapperState, SchemaNode } from "@/lib/types";

interface TreeRowProps {
  node: SchemaNode;
  side: "s" | "t";
  state: MapperState;
  dispatch: Dispatch<MapperAction>;
  targetSchema: SchemaNode[];
}

/**
 * A single row in the source or target tree. Handles:
 * - Expand/collapse for groups and loops
 * - Click-to-select (source) / click-to-map (target)
 * - Inline display of the base mapping underneath the source row
 */
export function TreeRow({ node, side, state, dispatch, targetSchema }: TreeRowProps) {
  const isEl = node.type === "el";
  const isLp = node.type === "loop";
  const isGr = node.type === "group";

  const baseMap = isEl
    ? state.maps.find((m) => (side === "s" ? m.sid === node.id : m.tid === node.id) && !m.co)
    : null;
  const overrides = isEl
    ? state.maps.filter((m) => (side === "s" ? m.sid === node.id : m.tid === node.id) && m.co)
    : [];
  const isMapped = !!baseMap;
  const isSel = side === "s" && state.selSrc === node.id;
  const isActive =
    !!state.selMap && (baseMap?.id === state.selMap || overrides.some((o) => o.id === state.selMap));
  const indent = node.d * 18;

  const handleClick = () => {
    if (node.kids?.length && !isEl) {
      dispatch({ type: "TOG", id: node.id });
      return;
    }
    if (isEl && side === "s") {
      dispatch({ type: "SEL_SRC", id: node.id });
    } else if (isEl && side === "t" && state.selSrc) {
      dispatch({ type: "MAP", tid: node.id });
    }
    if (isEl && baseMap) dispatch({ type: "SELM", id: baseMap.id });
  };

  const rowBg = isActive
    ? "#fef3c7"
    : isSel
      ? COLORS.blueSoft
      : isMapped
        ? baseMap?.ok
          ? COLORS.greenSoft
          : "#fdfcf5"
        : isLp
          ? COLORS.cream
          : COLORS.paper;

  const gridTemplate =
    side === "s" ? "minmax(130px,2fr) 1.1fr 0.5fr" : "minmax(130px,2fr) 1.1fr";

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: "grid",
          gridTemplateColumns: gridTemplate,
          borderBottom: `1px solid ${isLp ? COLORS.bHard : COLORS.border}`,
          background: rowBg,
          cursor: isEl ? "pointer" : "default",
          position: "relative",
        }}
      >
        {/* Tree guide bars */}
        {Array.from({ length: node.d }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i + 1) * 18 - 9,
              top: 0,
              bottom: 0,
              width: 1,
              background: (side === "s" ? COLORS.blue : COLORS.purple) + "15",
            }}
          />
        ))}

        {/* Segment column */}
        <div
          style={{
            padding: `4px 4px 4px ${indent + 4}px`,
            borderRight: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 3,
            minWidth: 0,
          }}
        >
          {node.kids?.length && !isEl ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "TOG", id: node.id });
              }}
              style={{
                cursor: "pointer",
                fontSize: 8,
                color: COLORS.t3,
                width: 10,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {state.collapsed[node.id] ? "▶" : "▼"}
            </span>
          ) : isEl ? (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                border: `2px solid ${
                  isMapped
                    ? baseMap?.ok
                      ? COLORS.green
                      : COLORS.blue
                    : isSel
                      ? COLORS.blue
                      : COLORS.border
                }`,
                background: isMapped
                  ? baseMap?.ok
                    ? COLORS.green
                    : COLORS.blue
                  : "transparent",
              }}
            />
          ) : (
            <span style={{ width: 10 }} />
          )}

          {isLp && (
            <span
              style={{
                fontSize: 6,
                fontWeight: 800,
                padding: "0 2px",
                borderRadius: 2,
                background: COLORS.amberSoft,
                color: COLORS.amber,
                fontFamily: FONT_MONO,
                flexShrink: 0,
                lineHeight: "12px",
              }}
            >
              LP
            </span>
          )}
          {isGr && !isLp && (
            <span
              style={{
                fontSize: 6,
                fontWeight: 800,
                padding: "0 2px",
                borderRadius: 2,
                background: COLORS.blueSoft,
                color: COLORS.blue,
                fontFamily: FONT_MONO,
                flexShrink: 0,
                lineHeight: "12px",
              }}
            >
              G
            </span>
          )}

          <span
            style={{
              fontSize: 9.5,
              fontFamily: FONT_MONO,
              fontWeight: 600,
              color: isLp ? COLORS.amber : isGr ? COLORS.blue : COLORS.tx,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.seg}
          </span>

          {overrides.length > 0 && (
            <span
              style={{
                fontSize: 6,
                fontWeight: 800,
                padding: "0 3px",
                borderRadius: 8,
                background: COLORS.orangeSoft,
                color: COLORS.orange,
                fontFamily: FONT_MONO,
                flexShrink: 0,
              }}
            >
              {overrides.length}
            </span>
          )}
        </div>

        {/* Description column */}
        <div
          style={{
            padding: "4px",
            borderRight: side === "s" ? `1px solid ${COLORS.border}` : "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: COLORS.tx,
              fontWeight: isLp || isGr ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {node.label}
          </span>
        </div>

        {/* Sample column (source side only) */}
        {side === "s" && (
          <div style={{ padding: "4px", overflow: "hidden" }}>
            {isEl && (
              <span
                style={{
                  fontSize: 8,
                  fontFamily: FONT_MONO,
                  color: COLORS.t3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {node.sample}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline rule summary underneath mapped source rows */}
      {isMapped && side === "s" && baseMap && (
        <div
          onClick={() => dispatch({ type: "SELM", id: baseMap.id })}
          style={{
            padding: `1px 4px 1px ${indent + 22}px`,
            background: isActive ? "#fef3c7" : baseMap.ok ? "#eefbf0" : "#fffff5",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 3,
            cursor: "pointer",
            fontSize: 8,
          }}
        >
          <span style={{ color: RULE_TYPES[baseMap.rt]?.color || COLORS.blue }}>
            {RULE_TYPES[baseMap.rt]?.icon}
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              color: COLORS.purple,
              fontWeight: 600,
              maxWidth: 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {targetSchema.find((t) => t.id === baseMap.tid)?.seg}
          </span>
          {baseMap.v && (
            <span
              style={{
                color: COLORS.t2,
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              &quot;{baseMap.v}&quot;
            </span>
          )}
          {overrides.length > 0 && (
            <span style={{ color: COLORS.orange, fontWeight: 700, fontSize: 7 }}>
              +{overrides.length}
            </span>
          )}
          <span style={{ color: baseMap.ok ? COLORS.green : COLORS.t3, marginLeft: "auto" }}>
            {baseMap.ok ? "✓" : "○"}
          </span>
        </div>
      )}
    </div>
  );
}
