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
    mappingSpec: {
      samplePayload: string | null;
    };
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

      <TestWithSample
        fullUrl={fullUrl}
        samplePayload={endpoint.mappingSpec.samplePayload}
      />
    </section>
  );
}

function TestWithSample({
  fullUrl,
  samplePayload,
}: {
  fullUrl: string;
  samplePayload: string | null;
}) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    headers: Record<string, string>;
    body: string;
    durationMs: number;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [customPayload, setCustomPayload] = useState(samplePayload ?? "");
  const [showEditor, setShowEditor] = useState(false);

  if (!samplePayload && !showEditor) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-ink-mute">
          No sample payload saved on this mapping. Open the mapping studio,
          paste a sample in the Live Preview tab, and it will auto-save.
        </p>
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="mt-1 text-xs text-brand-blue underline"
        >
          Or paste a payload here to test manually
        </button>
      </div>
    );
  }

  async function onTest() {
    const payload = customPayload.trim();
    if (!payload) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    const start = Date.now();
    try {
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload,
      });
      const body = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k] = v;
      });
      setTestResult({
        status: res.status,
        headers,
        body: body.slice(0, 8192),
        durationMs: Date.now() - start,
      });
      router.refresh();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  const payloadSize = new Blob([customPayload]).size;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-ink-soft">
          Test with sample
        </span>
        <span className="text-[10px] text-ink-mute font-mono">
          {payloadSize} bytes
        </span>
      </div>

      <div className="relative">
        <textarea
          value={customPayload}
          onChange={(e) => setCustomPayload(e.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full text-[11px] font-mono bg-white border border-border rounded p-2 outline-none focus:border-brand-blue resize-y"
          placeholder="Paste a source payload…"
        />
        {samplePayload && customPayload !== samplePayload && (
          <button
            type="button"
            onClick={() => setCustomPayload(samplePayload)}
            className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded bg-paper-cream border border-border hover:bg-border text-ink-mute"
          >
            Reset to saved sample
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !customPayload.trim()}
          className="px-4 py-1.5 rounded bg-brand-green text-white text-xs font-semibold disabled:opacity-50"
        >
          {testing ? "Sending…" : "Send to endpoint"}
        </button>
        {samplePayload && (
          <a
            href={`data:application/octet-stream;charset=utf-8,${encodeURIComponent(samplePayload)}`}
            download="sample.edi"
            className="px-3 py-1.5 rounded border border-border bg-white text-xs font-semibold hover:bg-paper-cream"
          >
            Download sample
          </a>
        )}
      </div>

      {testError && (
        <div className="text-xs text-brand-red p-2 bg-brand-red/5 border border-brand-red/30 rounded">
          {testError}
        </div>
      )}

      {testResult && (
        <div className="border border-border rounded bg-paper overflow-hidden">
          <div className="px-3 py-1.5 bg-paper-cream border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold">
              Response{" "}
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  testResult.status < 300
                    ? "bg-brand-green-soft text-brand-green"
                    : testResult.status < 500
                      ? "bg-brand-amber-soft text-brand-amber"
                      : "bg-brand-red/10 text-brand-red"
                }`}
              >
                HTTP {testResult.status}
              </span>
            </span>
            <span className="text-[10px] text-ink-mute font-mono">
              {testResult.durationMs}ms
              {testResult.headers["x-integrateos-run-id"] && (
                <>
                  {" · "}
                  <a
                    href={`/runs/${testResult.headers["x-integrateos-run-id"]}`}
                    className="text-brand-blue underline"
                  >
                    View run
                  </a>
                </>
              )}
            </span>
          </div>
          <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-[16rem] overflow-y-auto">
            {testResult.body}
          </pre>
        </div>
      )}
    </div>
  );
}
