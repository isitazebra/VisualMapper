"use client";

import { type Dispatch } from "react";
import type { EdiVersion, MapperAction, MapperState, TargetFormat, TxType } from "@/lib/types";
import { COLORS, FONT_MONO } from "@/lib/rules";
import { CUSTOMERS, EDI_VERSIONS, FMT_LABELS } from "@/lib/schemas";

interface MapperToolbarProps {
  state: MapperState;
  dispatch: Dispatch<MapperAction>;
  stats: { total: number; ok: number; overrides: number };
}

/** Top app bar — logo, transaction/version/format pickers, stats, auto-map. */
export function MapperToolbar({ state, dispatch, stats }: MapperToolbarProps) {
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

        <select
          value={state.tx}
          onChange={(e) => dispatch({ type: "TX", v: e.target.value as TxType })}
          style={{
            padding: "2px 4px",
            borderRadius: 3,
            border: `1px solid ${COLORS.blue}44`,
            fontSize: 9,
            fontWeight: 700,
            background: COLORS.blueSoft,
            cursor: "pointer",
            color: COLORS.blue,
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
          style={{
            padding: "2px 3px",
            borderRadius: 3,
            border: `1px solid ${COLORS.purple}44`,
            fontSize: 8,
            fontWeight: 600,
            background: COLORS.purpleSoft,
            cursor: "pointer",
            color: COLORS.purple,
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
