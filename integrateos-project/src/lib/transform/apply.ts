/**
 * Rule application. Given a rule and the extracted source value,
 * returns the target value string (or `undefined` to suppress
 * emission).
 *
 * Additions in Phase 2.5b:
 *  - `formula`: rule.value names a formula in FORMULAS (cents_to_dollars,
 *    country_2to3, lb_to_kg, …). Unknown names emit the placeholder.
 *  - `dateFormat`: real parse → reformat using TOKENS ("YYYYMMDD->ISO").
 *  - `concat`: template mode — `{id}` placeholders reference other
 *    source leaves (resolved via ctx.resolveSource).
 *  - `parseXml`: pulls a tag or attribute out of the source string
 *    using the existing fast-xml-parser.
 *  - `splitField`: supports negative indexes and out-of-range safety.
 */
import { XMLParser } from "fast-xml-parser";
import type { FieldMap, RuleTypeId } from "../types";
import { FORMULAS } from "./formulas";
import { applyDateFormat } from "./dateFormat";
import { parse as parseExpression, evaluate as evaluateExpression } from "./expression";

export interface ApplyContext {
  /** Counter shared across the whole transform run — keyed by rule id
   * so repeated applications of the *same* rule increment consistently. */
  counters: Map<string, number>;
  /** Resolver the emitter installs so rules (e.g. concat templates /
   * conditional references) can look up other source fields honoring
   * the current iteration context. Accepts either a source-node id or
   * a seg (e.g. "ISA*06"). Returns undefined for unknown names. */
  resolveSource?: (sourceIdOrSeg: string) => string | undefined;
  /** Lookup tables by name (LookupTable.name → entries map). */
  lookupTables?: Map<string, Record<string, string>>;
  /** Returns the full per-iteration value array for a source leaf —
   * used by the `aggregate` rule type to sum/count across iterations. */
  allValuesForSource?: (sourceId: string) => (string | undefined)[] | undefined;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
});

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
      return new Date().toISOString().slice(0, 10);

    case "currentTime":
      return new Date().toISOString().slice(11, 19);

    case "suppress":
      return undefined;

    case "concat":
      return applyConcat(rule.v ?? "", sourceValue, ctx);

    case "splitField":
      return applySplit(sourceValue ?? "", rule.v ?? "");

    case "dateFormat":
      return applyDateFormat(sourceValue, rule.v ?? "");

    case "formula":
      return applyFormula(rule.v ?? "", sourceValue ?? "");

    case "parseXml":
      return applyParseXml(rule.v ?? "", sourceValue ?? "");

    case "autoIncrement":
    case "hlCounter": {
      const current = ctx.counters.get(rule.id) ?? 0;
      const next = current + 1;
      ctx.counters.set(rule.id, next);
      return String(next);
    }

    case "conditional":
      return evaluateConditional(rule, sourceValue, ctx);

    case "lookup":
      return applyLookup(rule.v ?? "", sourceValue ?? "", ctx);

    case "aggregate":
      return applyAggregate(rule.sid, rule.v ?? "", ctx);

    default:
      return `⟨${rule.rt}?⟩${sourceValue ? ` ${sourceValue}` : ""}`;
  }
}

/**
 * Picks the effective rule for a target id, considering the active
 * customer. Returns the base rule unless an active-customer override
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

// ─── Rule-specific impls ─────────────────────────────────────────────

/** concat: if template contains {id} placeholders, substitute via
 * ctx.resolveSource. {_} refers to the rule's own source value.
 * Otherwise behave as suffix-append: source + literal. */
function applyConcat(
  template: string,
  sourceValue: string | undefined,
  ctx: ApplyContext,
): string {
  if (/\{[^}]+\}/.test(template)) {
    return template.replace(/\{([^}]+)\}/g, (_, id: string) => {
      if (id === "_") return sourceValue ?? "";
      return ctx.resolveSource?.(id) ?? "";
    });
  }
  return `${sourceValue ?? ""}${template}`;
}

/** splitField: rule.value is `"start,end"` or just `"start"`. Negative
 * indexes count from the end of the string. Out-of-range indexes clamp. */
function applySplit(source: string, spec: string): string {
  if (!spec) return source;
  const [startRaw, endRaw] = spec.split(",");
  let start = parseInt(startRaw, 10);
  if (Number.isNaN(start)) return source;
  if (start < 0) start = Math.max(0, source.length + start);
  if (endRaw === undefined) return source.slice(start);
  let end = parseInt(endRaw, 10);
  if (Number.isNaN(end)) return source.slice(start);
  if (end < 0) end = Math.max(0, source.length + end);
  return source.slice(start, end);
}

/** lookup: rule.v is a LookupTable.name, sourceValue is the key.
 * Unknown tables → placeholder so the user can see which table is
 * missing. Unknown keys → pass source through unchanged. */
function applyLookup(
  tableName: string,
  sourceValue: string,
  ctx: ApplyContext,
): string {
  if (!tableName) return sourceValue;
  const table = ctx.lookupTables?.get(tableName);
  if (!table) {
    return `⟨lookup:${tableName}?⟩${sourceValue ? ` ${sourceValue}` : ""}`;
  }
  const key = sourceValue.trim();
  return table[key] ?? sourceValue;
}

function applyFormula(name: string, value: string): string {
  const fn = FORMULAS[name];
  if (!fn) return `⟨formula:${name || "?"}⟩ ${value}`;
  try {
    return fn(value);
  } catch (err) {
    return `⟨formula-error:${name}⟩ ${err instanceof Error ? err.message : ""}`;
  }
}

/** parseXml: rule.value is a tag path like "Shipment/Origin/City" or
 * "Shipment/@id" for attributes. Walks the parsed tree. */
function applyParseXml(path: string, value: string): string {
  if (!path) return value;
  if (!value) return "";
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(value);
  } catch {
    return "";
  }

  const parts = path.split("/").filter(Boolean);
  let current: unknown = parsed;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
    if (Array.isArray(current)) current = current[0];
  }

  if (current === null || current === undefined) return "";
  if (typeof current === "object") {
    const text = (current as Record<string, unknown>)["#text"];
    if (text !== undefined) return String(text);
    return "";
  }
  return String(current);
}

/**
 * Conditional evaluation backed by the expression parser.
 *  - Empty cond → pass sourceValue through (treated like direct).
 *  - Parse the cond; if the AST is well-formed, evaluate with a
 *    resolver that honors "_" (this rule's own source) and delegates
 *    other names to ctx.resolveSource (which accepts id or seg).
 *  - If the predicate holds → emit rule.v (or sourceValue if rule.v
 *    is empty, so "conditional" can act as a gate).
 *  - If the predicate is false → pass sourceValue through.
 *  - If parsing fails → legacy fallback: `= VALUE` pattern against the
 *    source value (preserves behavior of pre-2.5d rules).
 */
function evaluateConditional(
  rule: FieldMap,
  sourceValue: string | undefined,
  ctx: ApplyContext,
): string {
  const cond = rule.cond?.trim();
  if (!cond) return sourceValue ?? "";
  const expr = parseExpression(cond);
  if (expr) {
    const resolve = (name: string): string | undefined => {
      if (name === "_") return sourceValue;
      return ctx.resolveSource?.(name);
    };
    return evaluateExpression(expr, resolve) ? (rule.v ?? sourceValue ?? "") : (sourceValue ?? "");
  }
  // Legacy fallback.
  const match = cond.match(/=\s*(.+)$/);
  if (!match) return rule.v ?? "";
  const rhs = match[1].trim().replace(/^"|"$/g, "");
  if ((sourceValue ?? "").toLowerCase() === rhs.toLowerCase()) {
    return rule.v ?? "";
  }
  return sourceValue ?? "";
}

/** Aggregate across a source loop's iterations. rule.v is the op:
 *  - sum / avg / min / max — numeric aggregations
 *  - count — iteration count (ignores value)
 *  - first / last — first / last non-empty value
 */
function applyAggregate(
  sourceId: string,
  op: string,
  ctx: ApplyContext,
): string {
  const values = ctx.allValuesForSource?.(sourceId) ?? [];
  const nonEmpty = values.filter((v): v is string => v !== undefined && v !== "");
  const nums = nonEmpty.map(parseFloat).filter((n) => !Number.isNaN(n));
  switch (op) {
    case "count":
      return String(values.length);
    case "first":
      return nonEmpty[0] ?? "";
    case "last":
      return nonEmpty[nonEmpty.length - 1] ?? "";
    case "sum":
      return nums.reduce((a, b) => a + b, 0).toString();
    case "avg":
      return nums.length > 0
        ? (nums.reduce((a, b) => a + b, 0) / nums.length).toString()
        : "0";
    case "min":
      return nums.length > 0 ? Math.min(...nums).toString() : "";
    case "max":
      return nums.length > 0 ? Math.max(...nums).toString() : "";
    default:
      return `⟨aggregate:${op || "?"}⟩`;
  }
}

export type { RuleTypeId };
