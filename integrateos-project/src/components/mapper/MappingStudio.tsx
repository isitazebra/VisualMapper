"use client";

import { useMemo, useReducer, useRef, useState } from "react";
import { COLORS, FONT_SANS } from "@/lib/rules";
import { initialMapperState, mapperReducer, stateFromSpec } from "@/lib/mapperState";
import {
  FMT_LABELS,
  TX_LABELS,
  getSchemaById,
  getSourceSchema,
  getTargetSchema,
  builtinSourceSchemaId,
  builtinTargetSchemaId,
} from "@/lib/schemas";
import type { HydratedMappingSpec } from "@/lib/mappingSpec";
import { useDebouncedEffect } from "@/lib/useDebouncedEffect";
import { MapperToolbar } from "./MapperToolbar";
import { TreePanel } from "./TreePanel";
import { RulePanel } from "./RulePanel";

interface MappingStudioProps {
  /** If present, the studio loads this spec and autosaves changes. */
  initialSpec?: HydratedMappingSpec;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Top-level mapping studio — orchestrates state and the three panels. */
export function MappingStudio({ initialSpec }: MappingStudioProps) {
  const [state, dispatch] = useReducer(
    mapperReducer,
    initialSpec ? stateFromSpec(initialSpec) : initialMapperState,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  // Skip the very first autosave tick — it fires immediately after mount
  // because `state` is a fresh reference, but nothing actually changed.
  const hasMounted = useRef(false);

  // Prefer registry lookup via the stored schema ids (Phase 2.1). Fall
  // back to the legacy tx/fmt resolution for the ephemeral /mapper route
  // which has no persisted spec.
  const sourceSchemaId =
    initialSpec?.sourceSchemaId ?? builtinSourceSchemaId(state.tx);
  const targetSchemaId =
    initialSpec?.targetSchemaId ?? builtinTargetSchemaId(state.tx, state.fmt);

  const sourceSchemaDesc = useMemo(
    () => getSchemaById(sourceSchemaId),
    [sourceSchemaId],
  );
  const targetSchemaDesc = useMemo(
    () => getSchemaById(targetSchemaId),
    [targetSchemaId],
  );
  const sourceSchema = useMemo(
    () => sourceSchemaDesc?.nodes ?? getSourceSchema(state.tx),
    [sourceSchemaDesc, state.tx],
  );
  const targetSchema = useMemo(
    () => targetSchemaDesc?.nodes ?? getTargetSchema(state.tx, state.fmt),
    [targetSchemaDesc, state.tx, state.fmt],
  );

  const baseMaps = state.maps.filter((m) => !m.co);
  const stats = {
    total: baseMaps.length,
    ok: baseMaps.filter((m) => m.ok).length,
    overrides: state.maps.filter((m) => m.co).length,
  };

  // Debounced autosave — only active when we have a persisted spec.
  useDebouncedEffect(
    () => {
      if (!initialSpec) return;
      if (!hasMounted.current) {
        hasMounted.current = true;
        return;
      }
      void saveSpec(initialSpec.id, state.maps, state.tx, state.ver, state.fmt, {
        setStatus: setSaveStatus,
        setError: setSaveError,
      });
    },
    [state.maps, state.tx, state.ver, state.fmt],
    500,
  );

  const sourceBadge = sourceSchemaDesc
    ? formatBadge(sourceSchemaDesc.format, state.ver)
    : `X12 ${state.ver}`;
  const sourceTitle = sourceSchemaDesc?.displayName ?? TX_LABELS[state.tx];
  const targetBadge = targetSchemaDesc
    ? formatBadge(targetSchemaDesc.format)
    : state.fmt === "json"
      ? "{}"
      : state.fmt === "csv"
        ? "CSV"
        : "XML";
  const targetTitle = targetSchemaDesc?.displayName ?? FMT_LABELS[state.fmt];

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
      <MapperToolbar
        state={state}
        dispatch={dispatch}
        stats={stats}
        persisted={!!initialSpec}
        saveStatus={saveStatus}
        saveError={saveError}
        specName={initialSpec?.name}
        partnerId={initialSpec?.partnerId}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <TreePanel
          side="s"
          schema={sourceSchema}
          otherSchema={targetSchema}
          state={state}
          dispatch={dispatch}
          header={{
            badge: sourceBadge,
            badgeColor: "blue",
            title: sourceTitle,
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
            title: targetTitle,
          }}
          columns={{ segment: "Field / Path", description: "Description" }}
        />
      </div>

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

/** Short badge label shown next to the panel header. */
function formatBadge(format: string, version?: string): string {
  switch (format) {
    case "x12":
      return `X12 ${version ?? ""}`.trim();
    case "json":
      return "{}";
    case "csv":
      return "CSV";
    case "xml":
    case "otm_xml":
      return "XML";
    default:
      return format.toUpperCase();
  }
}

async function saveSpec(
  id: string,
  maps: unknown,
  txType: string,
  ediVersion: string,
  targetFormat: string,
  ctx: {
    setStatus: (s: SaveStatus) => void;
    setError: (msg: string | null) => void;
  },
) {
  ctx.setStatus("saving");
  ctx.setError(null);
  try {
    const res = await fetch(`/api/mappings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maps, txType, ediVersion, targetFormat }),
    });
    if (!res.ok) throw new Error(await res.text());
    ctx.setStatus("saved");
  } catch (err) {
    ctx.setStatus("error");
    ctx.setError(err instanceof Error ? err.message : String(err));
  }
}
