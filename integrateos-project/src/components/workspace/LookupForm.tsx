"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatEntriesAsLines, parseEntries, isEntriesMap } from "@/lib/lookups";

interface PartnerSummary {
  id: string;
  name: string;
}

interface LookupFormProps {
  /** When set, the form is in "edit" mode and PATCHes the existing row. */
  lookupId?: string;
  initial?: {
    name: string;
    description: string | null;
    partnerId: string | null;
    entries: Record<string, string>;
  };
  partners: PartnerSummary[];
}

const EXAMPLE = `# One key=value per line. Lines beginning with # are comments.
US=USA
CA=CAN
MX=MEX`;

/**
 * Shared create/edit form for LookupTable. Uses the line-based
 * parseEntries so users can paste either "key=value" lines or a JSON
 * object — parseEntries figures it out.
 */
export function LookupForm({ lookupId, initial, partners }: LookupFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [partnerId, setPartnerId] = useState<string>(initial?.partnerId ?? "");
  const [entriesText, setEntriesText] = useState(
    initial ? formatEntriesAsLines(initial.entries) : EXAMPLE,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const parsed = parseEntries(entriesText);
    if (!isEntriesMap(parsed)) {
      setError(parsed);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        partnerId: partnerId || null,
        entries: parsed,
      };
      const res = lookupId
        ? await fetch(`/api/lookups/${lookupId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/lookups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      router.push(`/lookups/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!lookupId) return;
    if (!confirm("Delete this lookup table? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lookups/${lookupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/lookups");
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
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="X12_214_STATUS"
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Scope
          </label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            <option value="">Global (all partners)</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Description (optional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mapping of raw X12 214 status codes to internal status enum."
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Entries — one <code>key=value</code> per line, or paste a JSON object
        </label>
        <textarea
          value={entriesText}
          onChange={(e) => setEntriesText(e.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full rounded border border-border px-2 py-1 text-xs bg-white outline-none focus:border-brand-blue font-mono"
        />
      </div>

      {error && <div className="text-xs text-brand-red">{error}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
        >
          {submitting ? "Saving…" : lookupId ? "Save changes" : "Create lookup"}
        </button>
        {lookupId && (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="px-4 py-1.5 rounded border border-brand-red text-brand-red font-semibold text-sm hover:bg-brand-red hover:text-white disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
