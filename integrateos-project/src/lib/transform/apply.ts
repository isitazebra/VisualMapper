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

export interface ApplyContext {
  /** Counter shared across the whole transform run — keyed by rule id
   * so repeated applications of the *same* rule increment consistently. */
  counters: Map<string, number>;
  /** Resolver the emitter installs so rules (e.g. concat templates)
   * can reference other source fields honoring the current iteration
   * context. Returns undefined for unknown ids or missing values. */
  resolveSource?: (sourceId: string) => string | undefined;
  /** Lookup tables by name (LookupTable.name → entries map). Populated
   * by the caller of runTransform. */
  lookupTables?: Map<string, Record<string, string>>;
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
 * Conservative conditional evaluation — Phase 2.5d will replace this
 * with a full expression parser. For now:
 *  - empty cond → treat like direct
 *  - "= <value>" form → compare sourceValue (case-insensitive) to value
 *  - anything else → fall back to sourceValue unchanged
 */
function evaluateConditional(
  rule: FieldMap,
  sourceValue: string | undefined,
  _ctx: ApplyContext,
): string {
  const cond = rule.cond?.trim();
  if (!cond) return sourceValue ?? "";
  const match = cond.match(/=\s*(.+)$/);
  if (!match) return rule.v ?? "";
  const rhs = match[1].trim().replace(/^"|"$/g, "");
  if ((sourceValue ?? "").toLowerCase() === rhs.toLowerCase()) {
    return rule.v ?? "";
  }
  return sourceValue ?? "";
}

export type { RuleTypeId };
