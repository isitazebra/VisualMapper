"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  initial: string;
  partnerId?: string;
  endpointId?: string;
  status?: string;
}

/** Search box for /runs that round-trips through the URL so a query is
 * shareable and bookmarkable. */
export function RunsSearchInput({ initial, partnerId, endpointId, status }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit() {
    const qs = new URLSearchParams();
    if (value.trim()) qs.set("q", value.trim());
    if (partnerId) qs.set("partnerId", partnerId);
    if (endpointId) qs.set("endpointId", endpointId);
    if (status) qs.set("status", status);
    const s = qs.toString();
    router.push(`/runs${s ? `?${s}` : ""}`);
  }

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Search by run id, payload content, error message, endpoint or partner name…"
        className="flex-1 rounded border border-border px-3 py-1.5 text-sm bg-white outline-none focus:border-brand-blue"
      />
      <button
        type="button"
        onClick={submit}
        className="px-3 py-1.5 rounded bg-brand-blue text-white text-sm font-semibold"
      >
        Search
      </button>
      {initial && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            const qs = new URLSearchParams();
            if (partnerId) qs.set("partnerId", partnerId);
            if (endpointId) qs.set("endpointId", endpointId);
            if (status) qs.set("status", status);
            const s = qs.toString();
            router.push(`/runs${s ? `?${s}` : ""}`);
          }}
          className="px-3 py-1.5 rounded border border-border bg-paper text-sm font-semibold hover:bg-paper-cream"
        >
          Clear
        </button>
      )}
    </div>
  );
}
