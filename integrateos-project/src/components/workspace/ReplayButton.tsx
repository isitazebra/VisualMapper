"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  runId: string;
}

export function ReplayButton({ runId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReplay() {
    if (!confirm("Replay this transaction against the current mapping?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.runId) {
        router.push(`/runs/${data.runId}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onReplay}
        disabled={busy}
        className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
      >
        {busy ? "Replaying…" : "↻ Replay with current mapping"}
      </button>
      {error && <div className="text-xs text-brand-red mt-2">{error}</div>}
    </div>
  );
}
