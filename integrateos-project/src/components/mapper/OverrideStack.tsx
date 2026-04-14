"use client";

import { type Dispatch, useState } from "react";
import type { FieldMap, MapperAction, RuleTypeId } from "@/lib/types";
import { RULE_TYPES, COLORS, ruleNeedsValue } from "@/lib/rules";
import { CUSTOMERS } from "@/lib/schemas";

interface OverrideStackProps {
  baseMap: FieldMap | undefined;
  overrides: FieldMap[];
  selMap: string | null;
  dispatch: Dispatch<MapperAction>;
}

/**
 * Customer override stack — renders each override as an editable row and
 * provides a picker to add a new one.
 */
export function OverrideStack({ baseMap, overrides, selMap, dispatch }: OverrideStackProps) {
  const [newCustomer, setNewCustomer] = useState("");
  const [newType] = useState<RuleTypeId>("hardcode");

  return (
    <>
      <div
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: COLORS.orange,
          marginBottom: 3,
          textTransform: "uppercase",
        }}
      >
        Overrides ({overrides.length})
      </div>

      {overrides.map((o) => (
        <div
          key={o.id}
          onClick={() => dispatch({ type: "SELM", id: o.id })}
          style={{
            background: selMap === o.id ? "#fef3c7" : COLORS.orangeSoft,
            border: `1px solid ${COLORS.orange}22`,
            borderRadius: 4,
            padding: 5,
            marginBottom: 2,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: COLORS.orange }}>{o.co}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "DEL", id: o.id });
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 7,
                color: COLORS.red,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            <select
              value={o.rt}
              onChange={(e) =>
                dispatch({ type: "UPD", id: o.id, u: { rt: e.target.value as RuleTypeId } })
              }
              style={{
                padding: "1px 2px",
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                fontSize: 7,
                background: COLORS.white,
                cursor: "pointer",
              }}
            >
              {Object.entries(RULE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
            {ruleNeedsValue(o.rt) && (
              <input
                value={o.v}
                onChange={(e) => dispatch({ type: "UPD", id: o.id, u: { v: e.target.value } })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Val..."
                style={{
                  flex: 1,
                  padding: "1px 3px",
                  borderRadius: 2,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 7,
                  fontFamily: "'Fira Code', monospace",
                  outline: "none",
                  background: COLORS.white,
                }}
              />
            )}
          </div>
          <input
            value={o.cond}
            onChange={(e) => dispatch({ type: "UPD", id: o.id, u: { cond: e.target.value } })}
            onClick={(e) => e.stopPropagation()}
            placeholder="If ISA*06 = ..."
            style={{
              width: "100%",
              padding: "1px 3px",
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              fontSize: 7,
              outline: "none",
              background: COLORS.white,
              marginTop: 2,
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}

      {baseMap && (
        <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
          <select
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            style={{
              flex: 1,
              padding: "1px 2px",
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              fontSize: 7,
              background: COLORS.white,
              cursor: "pointer",
            }}
          >
            <option value="">Customer...</option>
            {CUSTOMERS.filter((c) => c !== "(Base)").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (newCustomer) {
                dispatch({ type: "OVR", bid: baseMap.id, c: newCustomer, r: newType });
                setNewCustomer("");
              }
            }}
            disabled={!newCustomer}
            style={{
              padding: "1px 5px",
              borderRadius: 3,
              border: "none",
              cursor: newCustomer ? "pointer" : "default",
              background: newCustomer ? COLORS.orange : COLORS.border,
              color: "#fff",
              fontSize: 7,
              fontWeight: 700,
              opacity: newCustomer ? 1 : 0.5,
            }}
          >
            +OVR
          </button>
        </div>
      )}
    </>
  );
}
