"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface Props {
  partners: Array<{ id: string; name: string }>;
  endpoints: Array<{ id: string; name: string; partnerId: string }>;
}

type Condition = "error_rate_over" | "failure_count" | "volume_drop";

const CONDITION_HELP: Record<Condition, string> = {
  error_rate_over:
    "Threshold = ratio (0–1). Fires when failed/total ≥ threshold.",
  failure_count:
    "Threshold = absolute count. Fires when failed runs ≥ threshold.",
  volume_drop:
    "Threshold = absolute count. Fires when total runs < threshold (alerts on missing traffic).",
};

export function NewAlertForm({ partners, endpoints }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopeKind, setScopeKind] = useState<"global" | "partner" | "endpoint">(
    "global",
  );
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [endpointId, setEndpointId] = useState(endpoints[0]?.id ?? "");
  const [condition, setCondition] = useState<Condition>("error_rate_over");
  const [thresholdText, setThresholdText] = useState("0.05");
  const [windowMin, setWindowMin] = useState(15);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredEndpoints = useMemo(
    () =>
      scopeKind === "endpoint" && partnerId
        ? endpoints.filter((e) => e.partnerId === partnerId)
        : endpoints,
    [scopeKind, endpoints, partnerId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const threshold = parseFloat(thresholdText);
    if (Number.isNaN(threshold) || threshold < 0) {
      setError("Threshold must be a non-negative number.");
      return;
    }
    if (!webhookUrl.trim()) {
      setError("Webhook URL is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        condition,
        threshold,
        windowMin,
        channel: "webhook",
        webhookUrl: webhookUrl.trim(),
        active: true,
      };
      if (scopeKind === "partner") body.partnerId = partnerId;
      if (scopeKind === "endpoint") {
        body.endpointId = endpointId;
        body.partnerId = endpoints.find((e) => e.id === endpointId)?.partnerId ?? null;
      }
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      router.push(`/alerts/${saved.id}`);
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
          placeholder="High error rate on Coyote"
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Scope
          </label>
          <select
            value={scopeKind}
            onChange={(e) =>
              setScopeKind(e.target.value as "global" | "partner" | "endpoint")
            }
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            <option value="global">Global (all endpoints)</option>
            <option value="partner">Partner</option>
            <option value="endpoint">Endpoint</option>
          </select>
        </div>
        {scopeKind === "partner" && (
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
        )}
        {scopeKind === "endpoint" && (
          <div>
            <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
              Endpoint
            </label>
            <select
              value={endpointId}
              onChange={(e) => setEndpointId(e.target.value)}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
            >
              {filteredEndpoints.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue"
          >
            <option value="error_rate_over">Error rate ≥</option>
            <option value="failure_count">Failures ≥</option>
            <option value="volume_drop">Volume &lt;</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Threshold
          </label>
          <input
            value={thresholdText}
            onChange={(e) => setThresholdText(e.target.value)}
            placeholder={
              condition === "error_rate_over" ? "0.05 (5%)" : "5"
            }
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
      <p className="text-[11px] text-ink-mute">{CONDITION_HELP[condition]}</p>

      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Webhook URL
        </label>
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/…"
          className="w-full rounded border border-border px-2 py-1 text-sm bg-white outline-none focus:border-brand-blue font-mono"
        />
        <p className="text-[11px] text-ink-mute mt-1">
          POST body is JSON: {"{ summary, condition, threshold, windowMin, total, failed, endpoint, runId, firedAt }"}.
        </p>
      </div>

      {error && <div className="text-xs text-brand-red">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create rule"}
      </button>
    </form>
  );
}
