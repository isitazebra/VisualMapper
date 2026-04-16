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
} from "@/lib/schemas";
import type { SchemaDescriptor } from "@/lib/schemas/registry";
import type { HydratedMappingSpec } from "@/lib/mappingSpec";
import { useDebouncedEffect } from "@/lib/useDebouncedEffect";
import { MapperToolbar } from "./MapperToolbar";
import { TreePanel } from "./TreePanel";
import { RulePanel } from "./RulePanel";
import { PreviewPanel } from "./PreviewPanel";
import { ComposeBar } from "./ComposeBar";

interface MappingStudioProps {
  /** If present, the studio loads this spec and autosaves changes. */
  initialSpec?: HydratedMappingSpec;
  /** Pre-resolved source schema (built-in or custom). Required when
   * initialSpec is set — the server page does the lookup. */
  sourceDescriptor?: SchemaDescriptor;
  /** Pre-resolved target schema. */
  targetDescriptor?: SchemaDescriptor;
  /** Lookup tables visible to this mapping (global + partner-scoped). */
  lookupTables?: Record<string, Record<string, string>>;
  /** When true, suppresses autosave, compose bar, and editing controls.
   * Used by /demo to let visitors browse without modifying anything. */
  readOnly?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type BottomTab = "rule" | "preview";

/** Top-level mapping studio — orchestrates state and the three panels. */
export function MappingStudio({
  initialSpec,
  sourceDescriptor,
  targetDescriptor,
  lookupTables,
  readOnly,
}: MappingStudioProps) {
  const [state, dispatch] = useReducer(
    mapperReducer,
    initialSpec ? stateFromSpec(initialSpec) : initialMapperState,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("rule");
  const [sample, setSample] = useState<string>(initialSpec?.samplePayload ?? "");
  const hasMounted = useRef(false);
  const sampleMounted = useRef(false);

  const sourceSchemaDesc = useMemo(() => {
    if (sourceDescriptor) return sourceDescriptor;
    if (initialSpec) return getSchemaById(initialSpec.sourceSchemaId);
    return null;
  }, [sourceDescriptor, initialSpec]);

  const targetSchemaDesc = useMemo(() => {
    if (targetDescriptor) return targetDescriptor;
    if (initialSpec) return getSchemaById(initialSpec.targetSchemaId);
    return null;
  }, [targetDescriptor, initialSpec]);

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

  // Debounced autosave on maps / metadata changes.
  useDebouncedEffect(
    () => {
      if (!initialSpec || readOnly) return;
      if (!hasMounted.current) {
        hasMounted.current = true;
        return;
      }
      void saveSpec(
        initialSpec.id,
        { maps: state.maps, txType: state.tx, ediVersion: state.ver, targetFormat: state.fmt },
        { setStatus: setSaveStatus, setError: setSaveError },
      );
    },
    [state.maps, state.tx, state.ver, state.fmt],
    500,
  );

  // Separate debounced save for the sample payload.
  useDebouncedEffect(
    () => {
      if (!initialSpec || readOnly) return;
      if (!sampleMounted.current) {
        sampleMounted.current = true;
        return;
      }
      void saveSpec(
        initialSpec.id,
        { samplePayload: sample },
        { setStatus: setSaveStatus, setError: setSaveError },
      );
    },
    [sample],
    800,
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

  const bottomHeight = bottomTab === "preview" ? 360 : 180;

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
        persisted={!!initialSpec && !readOnly}
        saveStatus={readOnly ? undefined : saveStatus}
        saveError={readOnly ? undefined : saveError}
        specName={initialSpec?.name}
        partnerId={initialSpec?.partnerId}
        mappingId={initialSpec?.id}
      />

      {initialSpec && !readOnly && (
        <ComposeBar
          mappingId={initialSpec.id}
          dispatch={dispatch}
          sourceNodes={sourceSchema}
          targetNodes={targetSchema}
          currentMaps={state.maps}
        />
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <TreePanel
          side="s"
          schema={sourceSchema}
          otherSchema={targetSchema}
          state={state}
          dispatch={dispatch}
          header={{ badge: sourceBadge, badgeColor: "blue", title: sourceTitle }}
          columns={{ segment: "Segment", description: "Description", third: "Sample" }}
        />
        <TreePanel
          side="t"
          schema={targetSchema}
          otherSchema={sourceSchema}
          state={state}
          dispatch={dispatch}
          header={{ badge: targetBadge, badgeColor: "purple", title: targetTitle }}
          columns={{ segment: "Field / Path", description: "Description" }}
        />
      </div>

      <div
        style={{
          height: bottomHeight,
          borderTop: `2px solid ${COLORS.bHard}`,
          background: COLORS.paper,
          flexShrink: 0,
          overflow: "hidden",
          transition: "height 150ms ease-out",
        }}
      >
        <div
          style={{
            padding: "0 8px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.cream,
            display: "flex",
            gap: 4,
            alignItems: "stretch",
            height: 22,
          }}
        >
          <TabButton active={bottomTab === "rule"} onClick={() => setBottomTab("rule")}>
            📐 Rule Detail
          </TabButton>
          <TabButton active={bottomTab === "preview"} onClick={() => setBottomTab("preview")}>
            👁 Live Preview
          </TabButton>
        </div>

        <div style={{ height: `calc(100% - 22px)` }}>
          {bottomTab === "rule" ? (
            <RulePanel
              state={state}
              dispatch={dispatch}
              sourceSchema={sourceSchema}
              targetSchema={targetSchema}
            />
          ) : (
            <PreviewPanel
              sourceDescriptor={sourceSchemaDesc}
              targetDescriptor={targetSchemaDesc}
              maps={state.maps}
              activeCustomer={state.cust}
              sample={sample}
              onSampleChange={setSample}
              lookupTables={lookupTables}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: active ? COLORS.paper : "transparent",
        borderBottom: active ? `2px solid ${COLORS.blue}` : "2px solid transparent",
        padding: "0 10px",
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 700,
        color: active ? COLORS.tx : COLORS.t2,
        fontFamily: FONT_SANS,
      }}
    >
      {children}
    </button>
  );
}

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
  payload: Record<string, unknown>,
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
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    ctx.setStatus("saved");
  } catch (err) {
    ctx.setStatus("error");
    ctx.setError(err instanceof Error ? err.message : String(err));
  }
}
