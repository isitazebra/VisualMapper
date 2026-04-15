"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EdiVersion, TargetFormat, TxType } from "@/lib/types";
import {
  EDI_VERSIONS,
  FMT_LABELS,
  TX_LABELS,
  builtinSourceSchemaId,
  builtinTargetSchemaId,
} from "@/lib/schemas";

/**
 * Summary of a registered schema — same shape the /api/schemas GET
 * endpoint returns (builtins + customs unified).
 */
export interface SchemaSummary {
  id: string;
  kind: "builtin" | "custom";
  role: string;
  format: string;
  displayName: string;
  description?: string | null;
  leafCount?: number;
}

interface NewMappingFormProps {
  partnerId: string;
  sourceSchemas: SchemaSummary[];
  targetSchemas: SchemaSummary[];
}

/**
 * Create-mapping form with two modes:
 *
 *  - "X12 preset" (the original fast path): pick tx type + version + target
 *    format and we resolve to the canonical built-in schema ids.
 *  - "Custom": pick any registered source schema and any registered target
 *    schema — this is the path that covers uploaded / custom schemas.
 */
export function NewMappingForm({ partnerId, sourceSchemas, targetSchemas }: NewMappingFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"preset" | "custom">("preset");

  // Preset mode state
  const [txType, setTxType] = useState<TxType>("204");
  const [ediVersion, setEdiVersion] = useState<EdiVersion>("4010");
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("xml");

  // Custom mode state — defaults to first available source / target.
  const [sourceSchemaId, setSourceSchemaId] = useState<string>(
    sourceSchemas[0]?.id ?? "",
  );
  const [targetSchemaId, setTargetSchemaId] = useState<string>(
    targetSchemas[0]?.id ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceDesc = useMemo(
    () => sourceSchemas.find((s) => s.id === sourceSchemaId),
    [sourceSchemas, sourceSchemaId],
  );
  const targetDesc = useMemo(
    () => targetSchemas.find((s) => s.id === targetSchemaId),
    [targetSchemas, targetSchemaId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = {
      // Legacy columns — still required by the schema. For "custom" mode
      // where no X12 tx applies we stamp them with "custom" so the row is
      // well-formed; the source of truth is sourceSchemaId / targetSchemaId.
      txType: mode === "preset" ? txType : (sourceDesc?.id.startsWith("x12:") ? txType : "custom"),
      ediVersion: mode === "preset" ? ediVersion : "custom",
      targetFormat:
        mode === "preset" ? targetFormat : (targetDesc?.format ?? "json"),
      sourceFormat: mode === "preset" ? "x12" : (sourceDesc?.format ?? "json"),
      sourceSchemaId:
        mode === "preset" ? builtinSourceSchemaId(txType) : sourceSchemaId,
      targetSchemaId:
        mode === "preset"
          ? builtinTargetSchemaId(txType, targetFormat)
          : targetSchemaId,
    };

    if (mode === "custom" && (!sourceSchemaId || !targetSchemaId)) {
      setError("Pick both a source and a target schema.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/partners/${partnerId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const spec = await res.json();
      router.push(`/workspace/${partnerId}/mapping/${spec.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-1 mb-1 text-xs">
        <Tab active={mode === "preset"} onClick={() => setMode("preset")}>
          X12 preset
        </Tab>
        <Tab active={mode === "custom"} onClick={() => setMode("custom")}>
          Custom schemas
        </Tab>
      </div>

      {mode === "preset" ? (
        <>
          <Select
            label="Transaction"
            value={txType}
            onChange={(v) => setTxType(v as TxType)}
            options={Object.entries(TX_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select
            label="X12 Version"
            value={ediVersion}
            onChange={(v) => setEdiVersion(v as EdiVersion)}
            options={EDI_VERSIONS.map((v) => ({ value: v, label: `X12 ${v}` }))}
          />
          <Select
            label="Target format"
            value={targetFormat}
            onChange={(v) => setTargetFormat(v as TargetFormat)}
            options={Object.entries(FMT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </>
      ) : (
        <>
          <SchemaSelect
            label="Source schema"
            schemas={sourceSchemas}
            value={sourceSchemaId}
            onChange={setSourceSchemaId}
          />
          <SchemaSelect
            label="Target schema"
            schemas={targetSchemas}
            value={targetSchemaId}
            onChange={setTargetSchemaId}
          />
          <p className="text-[11px] text-ink-mute">
            Don&apos;t see your schema?{" "}
            <a href="/schemas/new" className="text-brand-blue underline">
              Infer one from a sample →
            </a>
          </p>
        </>
      )}

      {error && <div className="text-xs text-brand-red">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-3 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create mapping"}
      </button>
    </form>
  );
}

function Tab({
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
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded border text-xs font-semibold transition ${
        active
          ? "border-brand-blue bg-brand-blue-soft text-brand-blue"
          : "border-border bg-paper text-ink-soft hover:bg-paper-cream"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase text-ink-soft mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SchemaSelect({
  label,
  schemas,
  value,
  onChange,
}: {
  label: string;
  schemas: SchemaSummary[];
  value: string;
  onChange: (v: string) => void;
}) {
  const builtins = schemas.filter((s) => s.kind === "builtin");
  const customs = schemas.filter((s) => s.kind === "custom");
  return (
    <div>
      <label className="block text-xs font-bold uppercase text-ink-soft mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
      >
        {customs.length > 0 && (
          <optgroup label="Custom">
            {customs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} · {s.format}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Built-in">
          {builtins.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
