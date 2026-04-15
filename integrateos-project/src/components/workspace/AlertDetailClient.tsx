"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Rule {
  id: string;
  name: string;
  active: boolean;
  webhookUrl: string | null;
  threshold: number;
  windowMin: number;
}

export function AlertDetailClient({ rule }: { rule: Rule }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(rule.webhookUrl ?? "");
  const [threshold, setThreshold] = useState(String(rule.threshold));
  const [windowMin, setWindowMin] = useState(rule.windowMin);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    const t = parseFloat(threshold);
    if (Number.isNaN(t) || t < 0) {
      setError("Threshold must be a non-negative number.");
      return;
    }
    await patch({ threshold: t, windowMin, webhookUrl });
  }

  async function onDelete() {
    if (!confirm("Delete this alert rule? Its fire history will also be removed.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/alerts/${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/alerts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <section className="border border-border rounded p-4 bg-paper space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Threshold
          </label>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Window (min)
          </label>
          <input
            type="number"
            min={1}
            value={windowMin}
            onChange={(e) => setWindowMin(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Webhook URL
        </label>
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
        />
      </div>
      {error && <div className="text-xs text-brand-red">{error}</div>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-brand-blue text-white text-xs font-semibold disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => patch({ active: !rule.active })}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-border bg-white text-xs font-semibold hover:bg-paper-cream disabled:opacity-50"
        >
          {rule.active ? "Pause" : "Activate"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-brand-red text-brand-red text-xs font-semibold hover:bg-brand-red hover:text-white disabled:opacity-50 ml-auto"
        >
          Delete
        </button>
      </div>
    </section>
  );
}
