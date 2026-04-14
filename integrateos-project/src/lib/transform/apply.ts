/**
 * Rule application. Given a rule and the extracted source value, returns
 * the target value string (or `undefined` to suppress emission, or a
 * sentinel marker for rule types we don't evaluate yet).
 *
 * Supported in Phase 2.3:
 *  - direct / passthrough: copy the source value
 *  - hardcode: emit the rule's literal value
 *  - currentDate / currentTime: ISO date / time at evaluation time
 *  - suppress: emit nothing
 *  - concat: source value + rule.value (rule.value acts as a suffix / literal)
 *  - splitField: rule.value in "start,end" form → source.slice(start, end)
 *  - dateFormat: pass-through for now (format conversion coming in Phase 3)
 *  - autoIncrement / hlCounter: integer counter, monotonically increasing
 *    per transform run
 *
 * Anything else emits a "⟨<rule>?⟩" placeholder so the user sees that the
 * rule type is recognized but not executable yet.
 */
import type { FieldMap, RuleTypeId } from "../types";

export interface ApplyContext {
  /** Counter shared across the whole transform run — keyed by rule id
   * so repeated applications of the *same* rule increment consistently. */
  counters: Map<string, number>;
}

export function applyRule(
  rule: FieldMap,
  sourceValue: string | undefined,
  ctx: ApplyContext,
): string | undefined {
  switch (rule.rt) {
    case "direct":
    case "passthrough":
      return sourceValue ?? "";

    case "hardcode":
      return rule.v ?? "";

    case "currentDate":
      return new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    case "currentTime":
      return new Date().toISOString().slice(11, 19); // HH:MM:SS

    case "suppress":
      return undefined;

    case "concat":
      return `${sourceValue ?? ""}${rule.v ?? ""}`;

    case "splitField":
      return splitField(sourceValue ?? "", rule.v ?? "");

    case "dateFormat":
      // Phase 3 will do actual format parsing; for now pass through.
      return sourceValue ?? "";

    case "autoIncrement":
    case "hlCounter": {
      const current = ctx.counters.get(rule.id) ?? 0;
      const next = current + 1;
      ctx.counters.set(rule.id, next);
      return String(next);
    }

    case "conditional":
      return evaluateConditional(rule, sourceValue);

    case "lookup":
    case "formula":
    case "parseXml":
    default:
      return `⟨${rule.rt}?⟩${sourceValue ? ` ${sourceValue}` : ""}`;
  }
}

/**
 * Picks the effective rule for a target id, considering the active
 * customer. Returns the base rule unless an active customer override
 * matches (co === activeCustomer).
 */
export function effectiveRule(
  targetId: string,
  maps: FieldMap[],
  activeCustomer: string,
): FieldMap | null {
  const base = maps.find((m) => m.tid === targetId && m.co === null) ?? null;
  if (activeCustomer === "(Base)" || !activeCustomer) return base;

  const override = maps.find((m) => m.tid === targetId && m.co === activeCustomer);
  return override ?? base;
}

/** "start,end" → source.slice(start, end). Both indices optional. */
function splitField(source: string, spec: string): string {
  if (!spec) return source;
  const [startRaw, endRaw] = spec.split(",");
  const start = parseInt(startRaw, 10);
  const end = endRaw ? parseInt(endRaw, 10) : undefined;
  if (isNaN(start)) return source;
  if (end === undefined || isNaN(end)) return source.slice(start);
  return source.slice(start, end);
}

/**
 * Very conservative conditional: if rule.cond is empty, treat like
 * direct. If it matches "<lhs> = <rhs>" and <rhs> matches sourceValue
 * (case-insensitive), return rule.v. Otherwise return the sourceValue.
 * Full parsing + XPath-style lhs resolution comes with Phase 3 (NL
 * rule authoring).
 */
function evaluateConditional(rule: FieldMap, sourceValue: string | undefined): string {
  const cond = rule.cond?.trim();
  if (!cond) return sourceValue ?? "";
  const match = cond.match(/=\s*(.+)$/);
  if (!match) return `${rule.v ?? ""}`;
  const rhs = match[1].trim().replace(/^"|"$/g, "");
  if ((sourceValue ?? "").toLowerCase() === rhs.toLowerCase()) {
    return rule.v ?? "";
  }
  return sourceValue ?? "";
}

export type { RuleTypeId };
