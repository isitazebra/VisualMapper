/**
 * Top-level transform orchestrator. Parses the source, extracts loop-
 * aware values, resolves the effective rule per target leaf, and emits
 * the target payload.
 *
 * When the source is X12 and contains multiple ST/SE blocks inside a
 * functional group, runTransform fans out: runs the transform once per
 * transaction and concatenates the outputs separated by a banner.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap } from "../types";
import { parseSource, type ParsedSource } from "./parse";
import { extractSourceValues } from "./extract";
import { emitTarget } from "./emit";
import { effectiveRule } from "./apply";

export interface TransformRequest {
  source: SchemaDescriptor;
  target: SchemaDescriptor;
  maps: FieldMap[];
  sample: string;
  activeCustomer: string;
  lookupTables?: Map<string, Record<string, string>>;
}

export type TransformResult =
  | {
      ok: true;
      output: string;
      mappedCount: number;
      unmappedLeafCount: number;
      /** Number of distinct transactions processed (> 1 for
       * multi-document X12 functional groups). */
      transactionCount?: number;
    }
  | { ok: false; error: string };

export function runTransform(req: TransformRequest): TransformResult {
  let parsed: ParsedSource;
  try {
    parsed = parseSource(req.source.format, req.sample);
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't parse source payload: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Precompute effective rules once per call.
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

  // Multi-transaction fan-out for X12 functional groups.
  if (parsed.format === "x12" && parsed.transactions && parsed.transactions.length > 1) {
    const parts: string[] = [];
    parsed.transactions.forEach((txSegs, i) => {
      const txParsed: ParsedSource = { format: "x12", value: txSegs };
      const extract = extractSourceValues(req.source, txParsed);
      const output = emitTarget({
        targetDescriptor: req.target,
        sourceDescriptor: req.source,
        extract,
        rulesByTargetId,
        lookupTables: req.lookupTables,
      });
      parts.push(
        `── transaction ${i + 1} of ${parsed.transactions!.length} ──\n${output}`,
      );
    });
    return {
      ok: true,
      output: parts.join("\n\n"),
      mappedCount: mapped,
      unmappedLeafCount: unmapped,
      transactionCount: parsed.transactions.length,
    };
  }

  const extract = extractSourceValues(req.source, parsed);
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
