"use client";

import Link from "next/link";
import { type Dispatch } from "react";
import type { EdiVersion, MapperAction, MapperState, TargetFormat, TxType } from "@/lib/types";
import { COLORS, FONT_MONO } from "@/lib/rules";
import { CUSTOMERS, EDI_VERSIONS, FMT_LABELS } from "@/lib/schemas";

interface MapperToolbarProps {
  state: MapperState;
  dispatch: Dispatch<MapperAction>;
  stats: { total: number; ok: number; overrides: number };
  /** When true, tx/version/format are locked (already persisted). */
  persisted?: boolean;
  /** "idle" | "saving" | "saved" | "error" — shown when persisted. */
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  /** Mapping-spec name, shown when persisted. */
  specName?: string;
  /** Partner id so we can render a back link. */
  partnerId?: string;
  /** Mapping spec id — when present we show a "Review" link that opens
   * the plain-English review page in a new tab. */
  mappingId?: string;
}

/** Top app bar — logo, transaction/version/format pickers, stats, auto-map. */
export function MapperToolbar({
  state,
  dispatch,
  stats,
  persisted,
  saveStatus,
  saveError,
  specName,
  partnerId,
  mappingId,
}: MapperToolbarProps) {
  return (
    <div
      style={{
        background: COLORS.paper,
        borderBottom: `1px solid ${COLORS.bHard}`,
        padding: "4px 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        flexWrap: "wrap",
        gap: 3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {partnerId && (
          <Link
            href={`/workspace/${partnerId}`}
            style={{ fontSize: 9, color: COLORS.t3, textDecoration: "none" }}
            title="Back to workspace"
          >
            ←
          </Link>
        )}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 1.5,
            background: COLORS.blue,
            transform: "rotate(45deg)",
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 800 }}>IntegrateOS</span>
        {specName && (
          <span style={{ fontSize: 10, color: COLORS.t2, marginLeft: 4 }}>· {specName}</span>
        )}

        <select
          value={state.tx}
          onChange={(e) => dispatch({ type: "TX", v: e.target.value as TxType })}
          disabled={persisted}
          title={persisted ? "Create a new mapping spec to change the transaction type" : undefined}
          style={{
            padding: "2px 4px",
            borderRadius: 3,
            border: `1px solid ${COLORS.blue}44`,
            fontSize: 9,
            fontWeight: 700,
            background: COLORS.blueSoft,
            cursor: persisted ? "not-allowed" : "pointer",
            color: COLORS.blue,
            opacity: persisted ? 0.7 : 1,
          }}
        >
          <optgroup label="Tendering">
            <option value="204">204 Load Tender</option>
            <option value="990">990 Response</option>
          </optgroup>
          <optgroup label="Status">
            <option value="214">214 Shipment Status</option>
          </optgroup>
          <optgroup label="Billing">
            <option value="210">210 Freight Invoice</option>
          </optgroup>
          <optgroup label="Orders">
            <option value="850">850 Purchase Order</option>
            <option value="855">855 PO Ack</option>
            <option value="810">810 Invoice</option>
          </optgroup>
          <optgroup label="Shipping">
            <option value="856">856 ASN</option>
          </optgroup>
        </select>

        <select
          value={state.ver}
          onChange={(e) => dispatch({ type: "VER", v: e.target.value as EdiVersion })}
          style={{
            padding: "2px 3px",
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            fontSize: 8,
            background: COLORS.white,
            cursor: "pointer",
            fontFamily: FONT_MONO,
          }}
        >
          {EDI_VERSIONS.map((v) => (
            <option key={v} value={v}>
              X12 {v}
            </option>
          ))}
        </select>

        <select
          value={state.fmt}
          onChange={(e) => dispatch({ type: "FMT", v: e.target.value as TargetFormat })}
          disabled={persisted}
          title={persisted ? "Create a new mapping spec to change the target format" : undefined}
          style={{
            padding: "2px 3px",
            borderRadius: 3,
            border: `1px solid ${COLORS.purple}44`,
            fontSize: 8,
            fontWeight: 600,
            background: COLORS.purpleSoft,
            cursor: persisted ? "not-allowed" : "pointer",
            color: COLORS.purple,
            opacity: persisted ? 0.7 : 1,
          }}
        >
          {(Object.entries(FMT_LABELS) as [TargetFormat, string][]).map(([k, v]) => (
            <option key={k} value={k}>
              → {v}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {persisted && saveStatus && (
          <SaveIndicator status={saveStatus} error={saveError ?? null} />
        )}
        {partnerId && mappingId && (
          <Link
            href={`/workspace/${partnerId}/mapping/${mappingId}/review`}
            target="_blank"
            style={{
              fontSize: 8,
              padding: "1px 5px",
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.white,
              color: COLORS.t2,
              textDecoration: "none",
              fontWeight: 600,
            }}
            title="Open plain-English review of all rules in a new tab"
          >
            📄 Review
          </Link>
        )}
        <select
          value={state.cust}
          onChange={(e) => dispatch({ type: "CUST", v: e.target.value })}
          style={{
            padding: "1px 3px",
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            fontSize: 7,
            background: COLORS.white,
            cursor: "pointer",
          }}
        >
          {CUSTOMERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 7, fontFamily: FONT_MONO, color: COLORS.t3 }}>
          {stats.ok}/{stats.total} · {stats.overrides}ovr
        </span>
        <button
          onClick={() => dispatch({ type: "AUTO" })}
          style={{
            padding: "2px 7px",
            borderRadius: 3,
            border: `1px solid ${COLORS.blue}33`,
            background: COLORS.blueSoft,
            cursor: "pointer",
            fontSize: 8,
            fontWeight: 700,
            color: COLORS.blue,
          }}
        >
          🤖 Auto
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  error,
}: {
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
}) {
  const map = {
    idle: { color: COLORS.t3, label: "—" },
    saving: { color: COLORS.amber, label: "Saving…" },
    saved: { color: COLORS.green, label: "✓ Saved" },
    error: { color: COLORS.red, label: "⚠ Error" },
  } as const;
  const { color, label } = map[status];
  return (
    <span
      title={error ?? undefined}
      style={{
        fontSize: 8,
        fontFamily: FONT_MONO,
        fontWeight: 600,
        color,
        padding: "0 5px",
      }}
    >
      {label}
    </span>
  );
}
