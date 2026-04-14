/**
 * Plain-English explanation of a mapping rule. Deterministic (no LLM)
 * so we can render it live in the studio and on the review page without
 * an API round-trip. The LLM authoring flow (Phase 3.2) will produce
 * rules whose English here should read identically to what the user
 * typed — that's the tight loop.
 */
import type { FieldMap, SchemaNode } from "./types";

export interface ExplainInputs {
  base: FieldMap;
  overrides: FieldMap[];
  sourceNode?: SchemaNode;
  targetNode?: SchemaNode;
}

/**
 * Full explanation for a base rule plus its overrides. Sentences are
 * joined with spaces so they read as a short paragraph.
 */
export function explainMapping({
  base,
  overrides,
  sourceNode,
  targetNode,
}: ExplainInputs): string {
  const src = sourceNode?.seg ?? base.sid;
  const tgt = targetNode?.seg ?? base.tid;
  const parts = [explainRule(base, src, tgt)];
  for (const o of overrides) {
    parts.push(explainOverride(o, src, tgt));
  }
  return parts.join(" ");
}

/**
 * Single-rule explanation. Renders the base rule's intent in present-
 * tense English. Returns a full sentence ending in a period.
 */
export function explainRule(rule: FieldMap, src: string, tgt: string): string {
  switch (rule.rt) {
    case "direct":
      return `Copy ${src} → ${tgt}.`;
    case "passthrough":
      return `Pass ${src} through unchanged to ${tgt}.`;
    case "hardcode":
      return rule.v
        ? `Always set ${tgt} to "${rule.v}".`
        : `Always set ${tgt} to a fixed value (value not yet specified).`;
    case "suppress":
      return `Do not send ${tgt}.`;
    case "currentDate":
      return `Stamp ${tgt} with today's date at transform time.`;
    case "currentTime":
      return `Stamp ${tgt} with the current time at transform time.`;
    case "concat":
      return rule.v
        ? `Write ${src} followed by "${rule.v}" into ${tgt}.`
        : `Concatenate ${src} with a suffix (not yet specified) into ${tgt}.`;
    case "conditional":
      if (rule.cond && rule.v) return `If ${rule.cond}, set ${tgt} to "${rule.v}".`;
      if (rule.cond) return `Conditionally set ${tgt} based on ${rule.cond} (value not yet specified).`;
      return `Conditionally set ${tgt} (condition not yet specified).`;
    case "lookup":
      return rule.v
        ? `Look up ${src} in table "${rule.v}" and write the result to ${tgt}.`
        : `Look up ${src} in a table (name not yet specified) and write to ${tgt}.`;
    case "formula":
      return rule.v
        ? `Apply formula "${rule.v}" to ${src} and write to ${tgt}.`
        : `Apply a formula (not yet specified) to ${src} and write to ${tgt}.`;
    case "dateFormat":
      return rule.v
        ? `Reformat ${src} as ${rule.v} and write to ${tgt}.`
        : `Reformat the date in ${src} (format not yet specified) and write to ${tgt}.`;
    case "splitField":
      return rule.v
        ? `Take substring ${rule.v} of ${src} and write to ${tgt}.`
        : `Take a substring of ${src} (range not yet specified) and write to ${tgt}.`;
    case "autoIncrement":
      return `Auto-increment a counter and write to ${tgt}.`;
    case "hlCounter":
      return `Use the HL hierarchical counter for ${tgt}.`;
    case "parseXml":
      return rule.v
        ? `Parse XML tag "${rule.v}" inside ${src} and write to ${tgt}.`
        : `Parse an XML tag from ${src} (tag name not yet specified) into ${tgt}.`;
    case "aggregate": {
      const op = (rule.v || "sum").toLowerCase();
      switch (op) {
        case "count":
          return `Count iterations of ${src} and write the total to ${tgt}.`;
        case "sum":
          return `Sum ${src} across all iterations and write to ${tgt}.`;
        case "avg":
          return `Average ${src} across all iterations and write to ${tgt}.`;
        case "min":
          return `Take the minimum ${src} across all iterations and write to ${tgt}.`;
        case "max":
          return `Take the maximum ${src} across all iterations and write to ${tgt}.`;
        case "first":
          return `Write the first non-empty ${src} to ${tgt}.`;
        case "last":
          return `Write the last non-empty ${src} to ${tgt}.`;
        default:
          return `Aggregate ${src} across iterations using ${op} and write to ${tgt}.`;
      }
    }
    default:
      return `Apply ${rule.rt} to ${src} → ${tgt}.`;
  }
}

/**
 * Override explanation — same rule text prefixed with "For {customer}:",
 * lowercased, with the condition optionally appended as "when …". If
 * the rule is already a `conditional`, its condition is already baked
 * into the sentence so we don't duplicate it.
 */
export function explainOverride(rule: FieldMap, src: string, tgt: string): string {
  const customer = rule.co ?? "an override";
  const sentence = explainRule(rule, src, tgt).replace(/\.$/, "");
  const conditionClause =
    rule.rt !== "conditional" && rule.cond ? ` when ${rule.cond}` : "";
  const lowered = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  return `For ${customer}: ${lowered}${conditionClause}.`;
}
