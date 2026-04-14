/**
 * Top-level transform orchestrator. Parses the source, extracts values,
 * applies per-target rules, and emits the target payload.
 *
 * All-or-nothing: if parse fails we return the error; otherwise we
 * return the emitted string + a map of per-target-id evaluation notes
 * (e.g. which rule fired, which values were missing).
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap } from "../types";
import { parseSource } from "./parse";
import { extractSourceValues } from "./extract";
import { applyRule, effectiveRule } from "./apply";
import { emitTarget } from "./emit";

export interface TransformRequest {
  source: SchemaDescriptor;
  target: SchemaDescriptor;
  maps: FieldMap[];
  sample: string;
  /** "(Base)" for plain base-rule preview, or a customer name to see
   * that customer's effective override set. */
  activeCustomer: string;
}

export type TransformResult =
  | { ok: true; output: string; mappedCount: number; unmappedLeafCount: number }
  | { ok: false; error: string };

export function runTransform(req: TransformRequest): TransformResult {
  // 1. Parse source
  let parsed;
  try {
    parsed = parseSource(req.source.format, req.sample);
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't parse source payload: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 2. Extract values for every source leaf
  const sourceValues = extractSourceValues(req.source, parsed);

  // 3. Apply rules per target leaf
  const targetValues = new Map<string, string | undefined>();
  const ctx = { counters: new Map<string, number>() };
  let mapped = 0;
  let unmapped = 0;

  for (const node of req.target.nodes) {
    if (node.type !== "el") continue;
    const rule = effectiveRule(node.id, req.maps, req.activeCustomer);
    if (!rule) {
      unmapped++;
      continue;
    }
    const sourceValue = sourceValues.get(rule.sid);
    const result = applyRule(rule, sourceValue, ctx);
    targetValues.set(node.id, result);
    mapped++;
  }

  // 4. Emit target payload
  let output: string;
  try {
    output = emitTarget(req.target, targetValues);
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't emit target: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { ok: true, output, mappedCount: mapped, unmappedLeafCount: unmapped };
}

export type { ParsedSource } from "./parse";
