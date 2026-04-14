/**
 * Target-payload emitters — loop-aware. Given the target schema, the
 * extracted source values (per loop iteration), the effective rule for
 * each target leaf, and a source-leaf → loop-ancestor map, produces a
 * formatted string with one iteration in the target per iteration in
 * the "driver" source loop.
 *
 * Driver-loop detection: for each target loop we look at its descendant
 * leaves' rules, find each rule's source-loop ancestor, and pick the
 * most common one. If no descendants reference a looped source, the
 * target loop emits a single iteration (legacy behavior).
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap, SchemaNode } from "../types";
import type { ExtractResult } from "./extract";
import {
  buildLoopAncestry,
  descendantLeaves,
  topLevelNodes,
} from "./ancestry";
import { applyRule, type ApplyContext } from "./apply";

export interface EmitParams {
  targetDescriptor: SchemaDescriptor;
  sourceDescriptor: SchemaDescriptor;
  extract: ExtractResult;
  /** Effective rule per target leaf id (customer-aware). */
  rulesByTargetId: Map<string, FieldMap>;
  /** Passed down into applyCtx so `lookup` rules can resolve. */
  lookupTables?: Map<string, Record<string, string>>;
}

export function emitTarget(params: EmitParams): string {
  const ctx = buildEmitCtx(params);
  switch (params.targetDescriptor.format) {
    case "json":
      return emitJson(ctx);
    case "xml":
    case "otm_xml":
      return emitXml(ctx);
    case "csv":
      return emitCsv(ctx);
    default:
      return emitJson(ctx);
  }
}

interface EmitCtx {
  targetDescriptor: SchemaDescriptor;
  targetById: Map<string, SchemaNode>;
  sourceLeafToLoop: Map<string, string | null>;
  driverByTargetLoop: Map<string, string | null>;
  extract: ExtractResult;
  rulesByTargetId: Map<string, FieldMap>;
  applyCtx: ApplyContext;
  /** Mutated in-place by the emit walkers so applyCtx.resolveSource
   * (which closes over this) sees the current iteration state. */
  iterCtxRef: { current: Map<string, number> };
}

function buildEmitCtx(params: EmitParams): EmitCtx {
  const targetById = new Map(params.targetDescriptor.nodes.map((n) => [n.id, n]));
  const sourceLeafToLoop = params.extract.leafToLoop;
  const driverByTargetLoop = buildDriverMap(
    params.targetDescriptor.nodes,
    params.rulesByTargetId,
    sourceLeafToLoop,
  );
  // resolveSource is filled in per-iteration below so concat-template
  // rules see the correct value for the current loop scope. The ctx
  // here holds a reference; we mutate its closure-captured iterCtx as
  // the emitter walks.
  const iterCtxRef = { current: new Map<string, number>() };
  const applyCtx: ApplyContext = {
    counters: new Map(),
    lookupTables: params.lookupTables,
    resolveSource: (sourceId: string) => {
      const arr = params.extract.values.get(sourceId);
      if (!arr) return undefined;
      const loop = sourceLeafToLoop.get(sourceId);
      if (loop && iterCtxRef.current.has(loop)) {
        return arr[iterCtxRef.current.get(loop)!];
      }
      return arr[0];
    },
  };
  return {
    targetDescriptor: params.targetDescriptor,
    targetById,
    sourceLeafToLoop,
    driverByTargetLoop,
    extract: params.extract,
    rulesByTargetId: params.rulesByTargetId,
    applyCtx,
    iterCtxRef,
  };
}

function buildDriverMap(
  targetNodes: SchemaNode[],
  rulesByTargetId: Map<string, FieldMap>,
  sourceLeafToLoop: Map<string, string | null>,
): Map<string, string | null> {
  const targetLoopAncestry = buildLoopAncestry(targetNodes);
  const driver = new Map<string, string | null>();

  for (const node of targetNodes) {
    if (node.type !== "loop") continue;
    const leaves = descendantLeaves(node, targetNodes);
    const votes = new Map<string, number>();
    for (const leaf of leaves) {
      const rule = rulesByTargetId.get(leaf.id);
      if (!rule) continue;
      const srcLoop = sourceLeafToLoop.get(rule.sid);
      if (srcLoop) votes.set(srcLoop, (votes.get(srcLoop) ?? 0) + 1);
    }
    let best: [string, number] | null = null;
    for (const entry of votes) {
      if (!best || entry[1] > best[1]) best = entry;
    }
    driver.set(node.id, best ? best[0] : null);
  }

  void targetLoopAncestry;
  return driver;
}

/** Resolve a source value for a specific target leaf rule, honoring
 * the current iteration context. */
function resolveSource(
  rule: FieldMap,
  iterCtx: Map<string, number>,
  ctx: EmitCtx,
): string | undefined {
  const arr = ctx.extract.values.get(rule.sid);
  if (!arr) return undefined;
  const sourceLoop = ctx.sourceLeafToLoop.get(rule.sid);
  if (sourceLoop && iterCtx.has(sourceLoop)) {
    return arr[iterCtx.get(sourceLoop)!] ?? undefined;
  }
  return arr[0];
}

// ─── JSON ────────────────────────────────────────────────────────────
function emitJson(ctx: EmitCtx): string {
  const tops = topLevelNodes(ctx.targetDescriptor.nodes);
  const obj: Record<string, unknown> = {};
  const iterCtx = ctx.iterCtxRef.current;
  for (const n of tops) {
    const v = buildJson(n, iterCtx, ctx);
    if (v !== undefined) obj[jsonKey(n)] = v;
  }
  return JSON.stringify(obj, null, 2);
}

function buildJson(
  node: SchemaNode,
  iterCtx: Map<string, number>,
  ctx: EmitCtx,
): unknown {
  if (node.type === "el") {
    const rule = ctx.rulesByTargetId.get(node.id);
    if (!rule) return undefined;
    const srcValue = resolveSource(rule, iterCtx, ctx);
    const result = applyRule(rule, srcValue, ctx.applyCtx);
    return result;
  }

  if (node.type === "loop") {
    const driverLoop = ctx.driverByTargetLoop.get(node.id) ?? null;
    const n = driverLoop
      ? Math.max(1, ctx.extract.loopIterationCount.get(driverLoop) ?? 1)
      : 1;
    const items: Record<string, unknown>[] = [];
    for (let i = 0; i < n; i++) {
      if (driverLoop) iterCtx.set(driverLoop, i);
      const item: Record<string, unknown> = {};
      for (const kidId of node.kids ?? []) {
        const kid = ctx.targetById.get(kidId);
        if (!kid) continue;
        const v = buildJson(kid, iterCtx, ctx);
        if (v !== undefined) item[jsonKey(kid)] = v;
      }
      if (Object.keys(item).length > 0) items.push(item);
      if (driverLoop) iterCtx.delete(driverLoop);
    }
    return items.length > 0 ? items : undefined;
  }

  // group
  const obj: Record<string, unknown> = {};
  for (const kidId of node.kids ?? []) {
    const kid = ctx.targetById.get(kidId);
    if (!kid) continue;
    const v = buildJson(kid, iterCtx, ctx);
    if (v !== undefined) obj[jsonKey(kid)] = v;
  }
  return Object.keys(obj).length > 0 ? obj : undefined;
}

function jsonKey(node: SchemaNode): string {
  const seg = node.seg.replace(/^\./, "").replace(/\[\]$/, "");
  return seg || node.label;
}

// ─── XML ─────────────────────────────────────────────────────────────
function emitXml(ctx: EmitCtx): string {
  const tops = topLevelNodes(ctx.targetDescriptor.nodes);
  const rootName = ctx.targetDescriptor.txType ? ctx.targetDescriptor.txType : "Root";
  const lines: string[] = [`<${rootName}>`];
  const iterCtx = ctx.iterCtxRef.current;
  for (const n of tops) buildXml(n, iterCtx, ctx, lines, 1);
  lines.push(`</${rootName}>`);
  return lines.join("\n");
}

function buildXml(
  node: SchemaNode,
  iterCtx: Map<string, number>,
  ctx: EmitCtx,
  lines: string[],
  depth: number,
): void {
  const indent = "  ".repeat(depth);
  const tag = xmlLastTag(node.seg) || node.label;

  if (node.type === "el") {
    const rule = ctx.rulesByTargetId.get(node.id);
    if (!rule) return;
    const srcValue = resolveSource(rule, iterCtx, ctx);
    const result = applyRule(rule, srcValue, ctx.applyCtx);
    if (result === undefined) return;
    lines.push(`${indent}<${tag}>${escapeXml(result)}</${tag}>`);
    return;
  }

  if (node.type === "loop") {
    const driverLoop = ctx.driverByTargetLoop.get(node.id) ?? null;
    const n = driverLoop
      ? Math.max(1, ctx.extract.loopIterationCount.get(driverLoop) ?? 1)
      : 1;
    for (let i = 0; i < n; i++) {
      if (driverLoop) iterCtx.set(driverLoop, i);
      const childLines: string[] = [];
      for (const kidId of node.kids ?? []) {
        const kid = ctx.targetById.get(kidId);
        if (kid) buildXml(kid, iterCtx, ctx, childLines, depth + 1);
      }
      if (childLines.length > 0) {
        lines.push(`${indent}<${tag}>`);
        lines.push(...childLines);
        lines.push(`${indent}</${tag}>`);
      }
      if (driverLoop) iterCtx.delete(driverLoop);
    }
    return;
  }

  // group
  const childLines: string[] = [];
  for (const kidId of node.kids ?? []) {
    const kid = ctx.targetById.get(kidId);
    if (kid) buildXml(kid, iterCtx, ctx, childLines, depth + 1);
  }
  if (childLines.length === 0) return;
  lines.push(`${indent}<${tag}>`);
  lines.push(...childLines);
  lines.push(`${indent}</${tag}>`);
}

function xmlLastTag(seg: string): string {
  const cleaned = seg.replace(/\[\]$/, "").replace(/\[\*\]$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? cleaned;
}

function escapeXml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── CSV ─────────────────────────────────────────────────────────────
function emitCsv(ctx: EmitCtx): string {
  const leaves = ctx.targetDescriptor.nodes.filter((n) => n.type === "el");
  const headers = leaves.map((n) => n.label);
  const iterCtx = ctx.iterCtxRef.current;
  const row = leaves.map((n) => {
    const rule = ctx.rulesByTargetId.get(n.id);
    if (!rule) return "";
    const srcValue = resolveSource(rule, iterCtx, ctx);
    const result = applyRule(rule, srcValue, ctx.applyCtx);
    return csvCell(result ?? "");
  });
  return [headers.join(","), row.join(",")].join("\n");
}

function csvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
