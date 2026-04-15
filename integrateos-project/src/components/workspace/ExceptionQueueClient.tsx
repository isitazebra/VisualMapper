"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";

interface ExceptionRow {
  id: string;
  receivedAt: Date;
  errorStage: string | null;
  errorMessage: string | null;
  inputSize: number;
  partner: { id: string; name: string };
  endpoint: { id: string; name: string };
}

interface Props {
  rows: ExceptionRow[];
}

type Busy = "idle" | "replaying" | "resolving";

interface BulkReplayResult {
  ok: true;
  summary: {
    total: number;
    succeeded: number;
    failedReplay: number;
    newFailures: number;
  };
}

/** Selectable exception list. Bulk replay executes each stored input
 * through its endpoint's current mapping; bulk resolve flips the
 * resolved flag so rows drop out of the queue. */
export function ExceptionQueueClient({ rows }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Busy>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected],
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function callBulk(action: "replay" | "resolve", note?: string) {
    if (selected.size === 0) return;
    setBusy(action === "replay" ? "replaying" : "resolving");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/runs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: Array.from(selected),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (action === "replay") {
        const r: BulkReplayResult = data;
        setResult(
          `Replayed ${r.summary.total} — ${r.summary.succeeded} delivered · ${r.summary.newFailures} still failing · ${r.summary.failedReplay} couldn't run.`,
        );
      } else {
        setResult(`Resolved ${data.updatedCount}. They're cleared from the queue.`);
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("idle");
    }
  }

  async function onResolve() {
    const note = prompt(
      "Add a note for the resolution (optional) — e.g. 'fixed upstream DTM format':",
      "",
    );
    if (note === null) return;
    await callBulk("resolve", note.trim() || undefined);
  }

  if (rows.length === 0) {
    return (
      <div className="text-sm text-ink-mute p-6 border border-dashed border-border rounded text-center">
        🎉 No unresolved exceptions. Everything&apos;s flowing.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs px-2 py-1 rounded border border-border bg-paper hover:bg-paper-cream font-semibold"
        >
          {allSelected ? "Unselect all" : `Select all (${rows.length})`}
        </button>
        <div className="flex-1" />
        <span className="text-xs text-ink-mute">
          {selected.size} selected
        </span>
        <button
          type="button"
          onClick={() => callBulk("replay")}
          disabled={selected.size === 0 || busy !== "idle"}
          className="text-xs px-3 py-1 rounded bg-brand-blue text-white font-semibold disabled:opacity-50"
        >
          {busy === "replaying" ? "Replaying…" : `↻ Replay ${selected.size || ""}`}
        </button>
        <button
          type="button"
          onClick={onResolve}
          disabled={selected.size === 0 || busy !== "idle"}
          className="text-xs px-3 py-1 rounded bg-brand-green text-white font-semibold disabled:opacity-50"
        >
          {busy === "resolving" ? "Resolving…" : `✓ Resolve ${selected.size || ""}`}
        </button>
      </div>

      {error && <div className="text-xs text-brand-red mb-2">{error}</div>}
      {result && (
        <div className="text-xs text-brand-green mb-2 p-2 bg-brand-green-soft rounded border border-brand-green/30">
          {result}
        </div>
      )}

      <table className="w-full text-xs border border-border rounded bg-paper">
        <thead>
          <tr className="bg-paper-cream text-ink-soft uppercase font-bold text-[10px]">
            <th className="w-8 px-2 py-1"></th>
            <th className="px-2 py-1 text-left">Received</th>
            <th className="px-2 py-1 text-left">Stage</th>
            <th className="px-2 py-1 text-left">Error</th>
            <th className="px-2 py-1 text-left">Endpoint</th>
            <th className="px-2 py-1 text-left">Partner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`border-t border-border hover:bg-paper-cream ${
                selected.has(r.id) ? "bg-brand-blue-soft" : ""
              }`}
            >
              <td className="px-2 py-1">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
              </td>
              <td className="px-2 py-1 font-mono">
                <Link
                  href={`/runs/${r.id}`}
                  className="text-brand-blue hover:underline"
                >
                  {r.receivedAt.toLocaleString()}
                </Link>
              </td>
              <td className="px-2 py-1">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red">
                  {r.errorStage ?? "error"}
                </span>
              </td>
              <td className="px-2 py-1 max-w-md truncate text-brand-red">
                {r.errorMessage ?? "unknown"}
              </td>
              <td className="px-2 py-1 font-mono truncate max-w-[14rem]">
                {r.endpoint.name}
              </td>
              <td className="px-2 py-1">{r.partner.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
