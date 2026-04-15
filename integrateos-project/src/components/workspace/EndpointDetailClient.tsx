"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  endpoint: {
    id: string;
    name: string;
    token: string;
    mode: string;
    egressUrl: string | null;
    active: boolean;
    createdAt: Date;
  };
}

/** Client bits for the endpoint detail page — shows the URL, lets the
 * user copy it, toggle active, rotate the token, or delete. */
export function EndpointDetailClient({ endpoint }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const path = `/api/ingress/${endpoint.token}`;
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : path;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, {
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

  async function onDelete() {
    if (!confirm("Delete this endpoint? Its transaction history will also be removed.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/endpoints");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore — not all browsers expose clipboard in this context.
    }
  }

  return (
    <section className="border border-border rounded p-4 bg-paper space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
          Ingress URL
        </label>
        <div className="flex gap-2">
          <code className="flex-1 text-xs font-mono bg-white border border-border rounded px-2 py-1 truncate">
            {fullUrl}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="px-3 py-1 rounded border border-border bg-white text-xs font-semibold hover:bg-paper-cream"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-[11px] text-ink-mute mt-1">
          POST a raw payload (body = source content). Sync mode returns the
          transformed output in the response; forward mode POSTs to the egress URL.
        </p>
      </div>

      {endpoint.egressUrl && (
        <div>
          <label className="block text-xs font-bold uppercase text-ink-soft mb-1">
            Egress URL
          </label>
          <code className="text-xs font-mono bg-white border border-border rounded px-2 py-1 inline-block">
            {endpoint.egressUrl}
          </code>
        </div>
      )}

      {error && <div className="text-xs text-brand-red">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => patch({ active: !endpoint.active })}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-border bg-white text-xs font-semibold hover:bg-paper-cream disabled:opacity-50"
        >
          {endpoint.active ? "Pause" : "Activate"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Rotate the token? The current URL will stop working — update any caller pointing at it.",
              )
            )
              patch({ rotateToken: true });
          }}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-brand-amber text-brand-amber text-xs font-semibold hover:bg-brand-amber-soft disabled:opacity-50"
        >
          Rotate token
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

      <details className="mt-2">
        <summary className="text-xs text-ink-mute cursor-pointer">
          Quick-test with curl
        </summary>
        <pre className="text-[11px] font-mono bg-white border border-border rounded p-2 mt-1 whitespace-pre-wrap break-all">
          {`curl -X POST '${fullUrl}' \\\n  -H 'Content-Type: application/octet-stream' \\\n  --data-binary @sample.edi`}
        </pre>
      </details>
    </section>
  );
}
