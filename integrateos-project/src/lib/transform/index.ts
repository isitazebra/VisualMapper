/**
 * Top-level transform orchestrator. Parses the source, extracts loop-
 * aware values, resolves the effective rule per target leaf, and emits
 * the target payload.
 *
 * "Effective rule" = the active customer's override for that target if
 * one exists; otherwise the base rule.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap } from "../types";
import { parseSource } from "./parse";
import { extractSourceValues } from "./extract";
import { emitTarget } from "./emit";
import { effectiveRule } from "./apply";

export interface TransformRequest {
  source: SchemaDescriptor;
  target: SchemaDescriptor;
  maps: FieldMap[];
  sample: string;
  /** "(Base)" for plain base-rule preview, or a customer name to see
   * that customer's effective override set. */
  activeCustomer: string;
  /** Optional lookup tables by name. When absent, `lookup` rules emit
   * a "⟨lookup:NAME?⟩" placeholder so the user can see what's missing. */
  lookupTables?: Map<string, Record<string, string>>;
}

export type TransformResult =
  | { ok: true; output: string; mappedCount: number; unmappedLeafCount: number }
  | { ok: false; error: string };

export function runTransform(req: TransformRequest): TransformResult {
  let parsed;
  try {
    parsed = parseSource(req.source.format, req.sample);
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't parse source payload: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const extract = extractSourceValues(req.source, parsed);

  // Resolve the effective rule for every target leaf once up front so
  // the emitter doesn't redo this lookup per-iteration.
  const rulesByTargetId = new Map<string, FieldMap>();
  let mapped = 0;
  let unmapped = 0;
  for (const node of req.target.nodes) {
    if (node.type !== "el") continue;
    const rule = effectiveRule(node.id, req.maps, req.activeCustomer);
    if (rule) {
      rulesByTargetId.set(node.id, rule);
      mapped++;
    } else {
      unmapped++;
    }
  }

  let output: string;
  try {
    output = emitTarget({
      targetDescriptor: req.target,
      sourceDescriptor: req.source,
      extract,
      rulesByTargetId,
      lookupTables: req.lookupTables,
    });
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't emit target: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { ok: true, output, mappedCount: mapped, unmappedLeafCount: unmapped };
}

export type { ParsedSource } from "./parse";
export type { ExtractResult } from "./extract";
