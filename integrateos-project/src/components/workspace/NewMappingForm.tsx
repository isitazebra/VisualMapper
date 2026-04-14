"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EdiVersion, TargetFormat, TxType } from "@/lib/types";
import { EDI_VERSIONS, FMT_LABELS, TX_LABELS } from "@/lib/schemas";

export function NewMappingForm({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [txType, setTxType] = useState<TxType>("204");
  const [ediVersion, setEdiVersion] = useState<EdiVersion>("4010");
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("xml");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/${partnerId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txType, ediVersion, targetFormat }),
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
