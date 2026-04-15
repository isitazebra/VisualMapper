/**
 * Target-payload emitters — stack-aware. Walks the target schema with
 * an active loop stack; resolves source values by looking in the
 * innermost iteration that contains them, then falling back outward
 * to the root. For each target loop, its "driver" source loop is
 * picked by majority vote of its descendants' rules; iterations come
 * from the current stack's innermost subLoops (or from rootLoops).
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap, SchemaNode } from "../types";
import type { ExtractResult, IterationNode } from "./extract";
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
  rulesByTargetId: Map<string, FieldMap>;
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
    case "x12":
      return emitX12(ctx);
    default:
      return emitJson(ctx);
  }
}

type LoopStack = Array<{ loopId: string; iterNode: IterationNode; iterIdx: number }>;

interface EmitCtx {
  targetDescriptor: SchemaDescriptor;
  targetById: Map<string, SchemaNode>;
  driverByTargetLoop: Map<string, string | null>;
  extract: ExtractResult;
  rulesByTargetId: Map<string, FieldMap>;
  applyCtx: ApplyContext;
  /** Mutated in place as we descend; applyCtx.resolveSource closes over it. */
  stack: LoopStack;
}

function buildEmitCtx(params: EmitParams): EmitCtx {
  const targetById = new Map(params.targetDescriptor.nodes.map((n) => [n.id, n]));
  const driverByTargetLoop = buildDriverMap(
    params.targetDescriptor.nodes,
    params.rulesByTargetId,
    params.extract.leafToLoop,
  );
  const sourceIdBySeg = new Map<string, string>();
  for (const n of params.sourceDescriptor.nodes) {
    if (!sourceIdBySeg.has(n.seg)) sourceIdBySeg.set(n.seg, n.id);
  }
  const stack: LoopStack = [];

  /** Walk the stack innermost-first; fall back to rootLeaves. */
  const resolveById = (sourceId: string): string | undefined => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const v = stack[i].iterNode.leafValues.get(sourceId);
      if (v !== undefined) return v;
    }
    return params.extract.rootLeaves.get(sourceId);
  };

  const applyCtx: ApplyContext = {
    counters: new Map(),
    lookupTables: params.lookupTables,
    resolveSource: (nameOrSeg: string) => {
      const byId = resolveById(nameOrSeg);
      if (byId !== undefined) return byId;
      const mapped = sourceIdBySeg.get(nameOrSeg);
      if (mapped) return resolveById(mapped);
      return undefined;
    },
    allValuesForSource: (sourceId) => collectAllValues(sourceId, params.extract),
  };

  return {
    targetDescriptor: params.targetDescriptor,
    targetById,
    driverByTargetLoop,
    extract: params.extract,
    rulesByTargetId: params.rulesByTargetId,
    applyCtx,
    stack,
  };
}

/**
 * Walks the whole extracted tree collecting every value for `sourceId`
 * — used by the `aggregate` rule type to sum/count across iterations
 * regardless of nesting level.
 */
function collectAllValues(
  sourceId: string,
  extract: ExtractResult,
): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  const rootV = extract.rootLeaves.get(sourceId);
  if (rootV !== undefined) out.push(rootV);
  const walk = (node: IterationNode) => {
    const v = node.leafValues.get(sourceId);
    if (v !== undefined) out.push(v);
    for (const iters of node.subLoops.values()) {
      for (const iter of iters) walk(iter);
    }
  };
  for (const iters of extract.rootLoops.values()) {
    for (const iter of iters) walk(iter);
  }
  return out;
}

function buildDriverMap(
  targetNodes: SchemaNode[],
  rulesByTargetId: Map<string, FieldMap>,
  sourceLeafToLoop: Map<string, string | null>,
): Map<string, string | null> {
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
  void buildLoopAncestry; // retained for future use
  return driver;
}

/** Iterations of the driver loop in the current scope. Looks inward
 * first (if the driver is a sub-loop of something on the stack), then
 * at the root. */
function findIterations(
  driverLoopId: string | null,
  ctx: EmitCtx,
): IterationNode[] {
  if (!driverLoopId) return [emptyIter()];
  for (let i = ctx.stack.length - 1; i >= 0; i--) {
    const iters = ctx.stack[i].iterNode.subLoops.get(driverLoopId);
    if (iters) return iters;
  }
  return ctx.extract.rootLoops.get(driverLoopId) ?? [emptyIter()];
}

function emptyIter(): IterationNode {
  return { leafValues: new Map(), subLoops: new Map() };
}

// ─── JSON ────────────────────────────────────────────────────────────
function emitJson(ctx: EmitCtx): string {
  const tops = topLevelNodes(ctx.targetDescriptor.nodes);
  const obj: Record<string, unknown> = {};
  for (const n of tops) {
    const v = buildJson(n, ctx);
    if (v !== undefined) obj[jsonKey(n)] = v;
  }
  return JSON.stringify(obj, null, 2);
}

function buildJson(node: SchemaNode, ctx: EmitCtx): unknown {
  if (node.type === "el") {
    const rule = ctx.rulesByTargetId.get(node.id);
    if (!rule) return undefined;
    const srcValue = ctx.applyCtx.resolveSource?.(rule.sid);
    return applyRule(rule, srcValue, ctx.applyCtx);
  }
  if (node.type === "loop") {
    const driverLoop = ctx.driverByTargetLoop.get(node.id) ?? null;
    const iters = findIterations(driverLoop, ctx);
    const items: Record<string, unknown>[] = [];
    for (let i = 0; i < iters.length; i++) {
      if (driverLoop) ctx.stack.push({ loopId: driverLoop, iterNode: iters[i], iterIdx: i });
      const item: Record<string, unknown> = {};
      for (const kidId of node.kids ?? []) {
        const kid = ctx.targetById.get(kidId);
        if (!kid) continue;
        const v = buildJson(kid, ctx);
        if (v !== undefined) item[jsonKey(kid)] = v;
      }
      if (driverLoop) ctx.stack.pop();
      if (Object.keys(item).length > 0) items.push(item);
    }
    return items.length > 0 ? items : undefined;
  }
  // group
  const obj: Record<string, unknown> = {};
  for (const kidId of node.kids ?? []) {
    const kid = ctx.targetById.get(kidId);
    if (!kid) continue;
    const v = buildJson(kid, ctx);
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
  for (const n of tops) buildXml(n, ctx, lines, 1);
  lines.push(`</${rootName}>`);
  return lines.join("\n");
}

function buildXml(
  node: SchemaNode,
  ctx: EmitCtx,
  lines: string[],
  depth: number,
): void {
  const indent = "  ".repeat(depth);
  const tag = xmlLastTag(node.seg) || node.label;

  if (node.type === "el") {
    const rule = ctx.rulesByTargetId.get(node.id);
    if (!rule) return;
    const srcValue = ctx.applyCtx.resolveSource?.(rule.sid);
    const result = applyRule(rule, srcValue, ctx.applyCtx);
    if (result === undefined) return;
    lines.push(`${indent}<${tag}>${escapeXml(result)}</${tag}>`);
    return;
  }

  if (node.type === "loop") {
    const driverLoop = ctx.driverByTargetLoop.get(node.id) ?? null;
    const iters = findIterations(driverLoop, ctx);
    for (let i = 0; i < iters.length; i++) {
      if (driverLoop) ctx.stack.push({ loopId: driverLoop, iterNode: iters[i], iterIdx: i });
      const childLines: string[] = [];
      for (const kidId of node.kids ?? []) {
        const kid = ctx.targetById.get(kidId);
        if (kid) buildXml(kid, ctx, childLines, depth + 1);
      }
      if (driverLoop) ctx.stack.pop();
      if (childLines.length > 0) {
        lines.push(`${indent}<${tag}>`);
        lines.push(...childLines);
        lines.push(`${indent}</${tag}>`);
      }
    }
    return;
  }

  const childLines: string[] = [];
  for (const kidId of node.kids ?? []) {
    const kid = ctx.targetById.get(kidId);
    if (kid) buildXml(kid, ctx, childLines, depth + 1);
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
  const row = leaves.map((n) => {
    const rule = ctx.rulesByTargetId.get(n.id);
    if (!rule) return "";
    const srcValue = ctx.applyCtx.resolveSource?.(rule.sid);
    const result = applyRule(rule, srcValue, ctx.applyCtx);
    return csvCell(result ?? "");
  });
  return [headers.join(","), row.join(",")].join("\n");
}

function csvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// ─── X12 ─────────────────────────────────────────────────────────────
/**
 * Generate X12 from a target schema whose leaves carry EDI segs
 * (`ISA*01`, `B2*04`, etc.). Walk the tree in schema order, gathering
 * leaves into segments when consecutive leaves share the same tag, and
 * expanding loops by iterating the driver source loop.
 *
 * Segments are joined with `~\n`. Trailing empty elements are trimmed
 * so output looks like `B2*02*CLNL*04*LD23029450` rather than
 * `B2**CLNL**LD23029450**`.
 */
function emitX12(ctx: EmitCtx): string {
  const out: string[] = [];
  const tops = topLevelNodes(ctx.targetDescriptor.nodes);
  emitX12Walk(tops, out, ctx);
  return out.join("~\n") + (out.length > 0 ? "~" : "");
}

function emitX12Walk(nodes: SchemaNode[], out: string[], ctx: EmitCtx): void {
  let pendingTag: string | null = null;
  let pendingLeaves: SchemaNode[] = [];

  const flush = () => {
    if (pendingTag && pendingLeaves.length > 0) {
      emitX12Segment(pendingTag, pendingLeaves, out, ctx);
    }
    pendingTag = null;
    pendingLeaves = [];
  };

  for (const node of nodes) {
    if (node.type === "el") {
      const parsed = parseX12Seg(node.seg);
      if (!parsed) continue;
      if (pendingTag && pendingTag !== parsed.tag) flush();
      pendingTag = parsed.tag;
      pendingLeaves.push(node);
      continue;
    }
    if (node.type === "group") {
      flush();
      const kids = (node.kids ?? [])
        .map((id) => ctx.targetById.get(id))
        .filter((n): n is SchemaNode => !!n);
      emitX12Walk(kids, out, ctx);
      flush();
      continue;
    }
    if (node.type === "loop") {
      flush();
      const driverLoop = ctx.driverByTargetLoop.get(node.id) ?? null;
      const iters = findIterations(driverLoop, ctx);
      const kids = (node.kids ?? [])
        .map((id) => ctx.targetById.get(id))
        .filter((n): n is SchemaNode => !!n);
      for (let i = 0; i < iters.length; i++) {
        if (driverLoop) ctx.stack.push({ loopId: driverLoop, iterNode: iters[i], iterIdx: i });
        emitX12Walk(kids, out, ctx);
        if (driverLoop) ctx.stack.pop();
      }
    }
  }
  flush();
}

function emitX12Segment(
  tag: string,
  leaves: SchemaNode[],
  out: string[],
  ctx: EmitCtx,
): void {
  const parts: string[] = [tag];
  for (const leaf of leaves) {
    const parsed = parseX12Seg(leaf.seg);
    if (!parsed) continue;
    const rule = ctx.rulesByTargetId.get(leaf.id);
    let value: string | undefined;
    if (rule) {
      const srcValue = ctx.applyCtx.resolveSource?.(rule.sid);
      value = applyRule(rule, srcValue, ctx.applyCtx);
    }
    const position = parsed.elIdx + 1;
    while (parts.length <= position) parts.push("");
    parts[position] = value ?? "";
  }
  // Trim trailing empty elements — standard X12 stops at the last
  // non-empty element rather than padding.
  while (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  // Skip empty segments entirely — no point emitting a "B2" with no data.
  if (parts.length <= 1) return;
  out.push(parts.join("*"));
}

function parseX12Seg(seg: string): { tag: string; elIdx: number } | null {
  const m = seg.match(/^([A-Z0-9]+)\*(\d+)/);
  if (!m) return null;
  return { tag: m[1], elIdx: parseInt(m[2], 10) - 1 };
}
