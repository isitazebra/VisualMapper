"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Minimal create-partner form, POSTs to /api/partners and routes into the new workspace. */
export function NewPartnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scac, setScac] = useState("");
  const [type, setType] = useState("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scac: scac.trim() || null,
          type,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const partner = await res.json();
      router.push(`/workspace/${partner.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kroger"
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            SCAC (optional)
          </label>
          <input
            value={scac}
            onChange={(e) => setScac(e.target.value)}
            placeholder="KRGR"
            maxLength={4}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            <option value="customer">Customer</option>
            <option value="carrier">Carrier</option>
            <option value="shipper">Shipper</option>
            <option value="3pl">3PL</option>
          </select>
        </div>
      </div>
      {error && <div className="text-xs text-brand-red">{error}</div>}
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create partner"}
      </button>
    </form>
  );
}
