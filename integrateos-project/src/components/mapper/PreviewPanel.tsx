"use client";

import { useMemo } from "react";
import type { SchemaDescriptor } from "@/lib/schemas/registry";
import type { FieldMap } from "@/lib/types";
import { COLORS, FONT_MONO } from "@/lib/rules";
import { runTransform } from "@/lib/transform";

interface PreviewPanelProps {
  sourceDescriptor: SchemaDescriptor | null;
  targetDescriptor: SchemaDescriptor | null;
  maps: FieldMap[];
  activeCustomer: string;
  sample: string;
  onSampleChange: (next: string) => void;
  /** Lookup tables available to `lookup` rules (name → entries). */
  lookupTables?: Record<string, Record<string, string>>;
}

/**
 * Live transform preview. Left pane: source payload textarea. Right
 * pane: rendered target output. Re-evaluates on every keystroke (cheap
 * for small payloads — for big samples this could become a concern but
 * we don't need debounce at this scale).
 */
export function PreviewPanel({
  sourceDescriptor,
  targetDescriptor,
  maps,
  activeCustomer,
  sample,
  onSampleChange,
  lookupTables,
}: PreviewPanelProps) {
  const lookupMap = useMemo(() => {
    if (!lookupTables) return undefined;
    return new Map(Object.entries(lookupTables));
  }, [lookupTables]);

  const result = useMemo(() => {
    if (!sourceDescriptor || !targetDescriptor) {
      return {
        ok: false as const,
        error: "Waiting for schemas to load…",
      };
    }
    if (!sample.trim()) {
      return {
        ok: false as const,
        error: "Paste a source payload on the left to see the target output.",
      };
    }
    return runTransform({
      source: sourceDescriptor,
      target: targetDescriptor,
      maps,
      sample,
      activeCustomer,
      lookupTables: lookupMap,
    });
  }, [sourceDescriptor, targetDescriptor, maps, activeCustomer, sample, lookupMap]);

  const sourceFormat = sourceDescriptor?.format ?? "json";
  const targetFormat = targetDescriptor?.format ?? "json";

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${COLORS.border}`,
          minWidth: 0,
        }}
      >
        <PaneHeader
          title={`Source sample (${sourceFormat})`}
          rightSlot={
            sample.length > 0 ? (
              <button
                onClick={() => onSampleChange("")}
                style={{
                  fontSize: 8,
                  padding: "1px 5px",
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.white,
                  cursor: "pointer",
                  color: COLORS.t2,
                }}
              >
                Clear
              </button>
            ) : null
          }
        />
        <textarea
          value={sample}
          onChange={(e) => onSampleChange(e.target.value)}
          placeholder={`Paste a ${sourceFormat.toUpperCase()} sample here…`}
          spellCheck={false}
          style={{
            flex: 1,
            padding: 8,
            border: "none",
            resize: "none",
            outline: "none",
            background: COLORS.paper,
            color: COLORS.tx,
            fontFamily: FONT_MONO,
            fontSize: 10,
            lineHeight: 1.4,
          }}
        />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <PaneHeader
          title={`Target output (${targetFormat})`}
          rightSlot={
            result.ok ? (
              <span style={{ fontSize: 8, color: COLORS.t3, fontFamily: FONT_MONO }}>
                {result.mappedCount} mapped · {result.unmappedLeafCount} skipped
              </span>
            ) : null
          }
        />
        <div
          style={{
            flex: 1,
            background: result.ok ? COLORS.white : "#fff7f0",
            padding: 8,
            overflow: "auto",
            fontFamily: FONT_MONO,
            fontSize: 10,
            lineHeight: 1.4,
            whiteSpace: "pre",
            color: result.ok ? COLORS.tx : COLORS.red,
          }}
        >
          {result.ok ? result.output : result.error}
        </div>
      </div>
    </div>
  );
}

function PaneHeader({ title, rightSlot }: { title: string; rightSlot?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "3px 8px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>{title}</span>
      {rightSlot}
    </div>
  );
}
