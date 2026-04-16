"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface PartnerOption {
  id: string;
  name: string;
}
interface MappingOption {
  id: string;
  name: string;
  partnerId: string;
  txType: string;
  targetFormat: string;
}

interface NewEndpointFormProps {
  partners: PartnerOption[];
  mappings: MappingOption[];
  initialPartnerId?: string;
}

/** Create-endpoint form. Partner selector narrows the mapping list so
 * users can only bind a mapping that belongs to the picked partner. */
export function NewEndpointForm({
  partners,
  mappings,
  initialPartnerId,
}: NewEndpointFormProps) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(initialPartnerId ?? partners[0]?.id ?? "");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"sync" | "forward">("sync");
  const [egressUrl, setEgressUrl] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partnerMappings = useMemo(
    () => mappings.filter((m) => m.partnerId === partnerId),
    [mappings, partnerId],
  );
  const [mappingSpecId, setMappingSpecId] = useState(partnerMappings[0]?.id ?? "");
  // Keep mapping selection in sync when partner changes. useEffect is
  // the right hook for side-effects like state resets; useMemo here
  // was misuse and flagged by react-hooks/exhaustive-deps.
  useEffect(() => {
    if (!partnerMappings.find((m) => m.id === mappingSpecId)) {
      setMappingSpecId(partnerMappings[0]?.id ?? "");
    }
  }, [partnerMappings, mappingSpecId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerId || !mappingSpecId || !name.trim()) {
      setError("Partner, mapping, and name are required.");
      return;
    }
    if (mode === "forward" && !egressUrl.trim()) {
      setError("Egress URL is required for forward mode.");
      return;
    }
    let egressHeaders: Record<string, string> | null = null;
    if (headersText.trim()) {
      try {
        const parsed = JSON.parse(headersText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          egressHeaders = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string") egressHeaders[k] = v;
          }
        } else {
          setError("Headers must be a JSON object of string values.");
          return;
        }
      } catch (err) {
        setError(`Invalid headers JSON: ${err instanceof Error ? err.message : ""}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          mappingSpecId,
          name: name.trim(),
          mode,
          egressUrl: egressUrl.trim() || null,
          egressHeaders,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      router.push(`/endpoints/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Partner
          </label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Mapping
          </label>
          <select
            value={mappingSpecId}
            onChange={(e) => setMappingSpecId(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            {partnerMappings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Endpoint name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prod inbound 204"
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "sync" | "forward")}
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
        >
          <option value="sync">Sync — return transformed output in response</option>
          <option value="forward">Forward — POST output to egress URL</option>
        </select>
      </div>

      {mode === "forward" && (
        <>
          <div>
            <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
              Egress URL
            </label>
            <input
              value={egressUrl}
              onChange={(e) => setEgressUrl(e.target.value)}
              placeholder="https://partner.example/receive"
              className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
              Egress headers (JSON, optional)
            </label>
            <textarea
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              rows={3}
              placeholder='{"Authorization": "Bearer …", "X-Source": "IntegrateOS"}'
              className="w-full rounded border border-border px-2 py-1 text-xs bg-white outline-none focus:border-brand-blue font-mono"
            />
          </div>
        </>
      )}

      {error && <div className="text-xs text-brand-red">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create endpoint"}
      </button>
    </form>
  );
}
