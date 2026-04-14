/**
 * Walks a source schema tree alongside its parsed payload and records
 * values for each leaf. For leaves in a loop, returns one value per
 * loop iteration; for non-loop leaves returns a single value.
 *
 * Returns ExtractResult which the emitter consumes with an iteration
 * context to pick the right value for a loop iteration.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { SchemaNode } from "../types";
import type { ParsedSource, X12Segment } from "./parse";
import { buildLoopAncestry, topLevelNodes } from "./ancestry";

export interface ExtractResult {
  /** leafId → values by iteration (length 1 when the leaf has no loop ancestor). */
  values: Map<string, Array<string | undefined>>;
  /** Each leaf/group/loop's nearest loop ancestor (or null). */
  leafToLoop: Map<string, string | null>;
  /** Iteration count per loop id. */
  loopIterationCount: Map<string, number>;
}

/** Helper that fills in values[leafId][iter] defensively. */
function setValue(
  values: ExtractResult["values"],
  leafId: string,
  iter: number,
  value: string | undefined,
): void {
  const arr = values.get(leafId) ?? [];
  arr[iter] = value;
  values.set(leafId, arr);
}

export function extractSourceValues(
  descriptor: SchemaDescriptor,
  parsed: ParsedSource,
): ExtractResult {
  const leafToLoop = buildLoopAncestry(descriptor.nodes);
  const loopIterationCount = new Map<string, number>();
  const values: ExtractResult["values"] = new Map();
  const ctx: ExtractCtx = {
    allNodes: descriptor.nodes,
    byId: new Map(descriptor.nodes.map((n) => [n.id, n])),
    leafToLoop,
    loopIterationCount,
    values,
  };
  const tops = topLevelNodes(descriptor.nodes);

  switch (parsed.format) {
    case "json":
    case "jsonInferred":
      for (const top of tops) walkJson(top, parsed.value, 0, ctx);
      break;
    case "xml":
      for (const top of tops) walkXml(top, parsed.value, 0, ctx);
      break;
    case "csv":
      walkCsv(descriptor.nodes, parsed.value, values);
      // For CSV we treat every row as an iteration of the (implicit)
      // single top-level loop; record that here.
      if (parsed.value.rows.length > 1) {
        // CSV schemas are flat — leaves live at depth 0 outside any
        // declared loop. Pretend there's a virtual "csv" loop just so
        // the emitter can render every row. (Skipped for Phase 2.5
        // MVP; emit still uses iteration 0 only for CSV targets.)
      }
      break;
    case "x12":
      walkX12(descriptor.nodes, parsed.value, ctx);
      break;
  }

  return { values, leafToLoop, loopIterationCount };
}

interface ExtractCtx {
  allNodes: SchemaNode[];
  byId: Map<string, SchemaNode>;
  leafToLoop: Map<string, string | null>;
  loopIterationCount: Map<string, number>;
  values: ExtractResult["values"];
}

// ─── JSON ────────────────────────────────────────────────────────────
function walkJson(
  node: SchemaNode,
  parent: unknown,
  iter: number,
  ctx: ExtractCtx,
): void {
  const key = jsonKeyFromSeg(node.seg);
  const local = pluckJson(parent, key);

  if (node.type === "el") {
    setValue(ctx.values, node.id, iter, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    const items = Array.isArray(local) ? local : local === undefined ? [] : [local];
    const prev = ctx.loopIterationCount.get(node.id) ?? 0;
    ctx.loopIterationCount.set(node.id, Math.max(prev, items.length));

    items.forEach((item, i) => {
      for (const kidId of node.kids ?? []) {
        const kid = ctx.byId.get(kidId);
        if (kid) walkJson(kid, item, i, ctx);
      }
    });
    return;
  }

  // group
  for (const kidId of node.kids ?? []) {
    const kid = ctx.byId.get(kidId);
    if (kid) walkJson(kid, local, iter, ctx);
  }
}

function jsonKeyFromSeg(seg: string): string {
  return seg.replace(/^\./, "").replace(/\[\]$/, "").replace(/\[\*\]$/, "");
}

function pluckJson(parent: unknown, key: string): unknown {
  if (parent === null || parent === undefined) return undefined;
  if (key === "") return parent;
  if (typeof parent === "object") {
    return (parent as Record<string, unknown>)[key];
  }
  return undefined;
}

// ─── XML ─────────────────────────────────────────────────────────────
function walkXml(
  node: SchemaNode,
  parent: unknown,
  iter: number,
  ctx: ExtractCtx,
): void {
  const tag = xmlTagFromSeg(node.seg);
  const local = pluckXml(parent, tag);

  if (node.type === "el") {
    setValue(ctx.values, node.id, iter, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    const items = Array.isArray(local) ? local : local === undefined ? [] : [local];
    const prev = ctx.loopIterationCount.get(node.id) ?? 0;
    ctx.loopIterationCount.set(node.id, Math.max(prev, items.length));

    items.forEach((item, i) => {
      for (const kidId of node.kids ?? []) {
        const kid = ctx.byId.get(kidId);
        if (kid) walkXml(kid, item, i, ctx);
      }
    });
    return;
  }

  // group
  for (const kidId of node.kids ?? []) {
    const kid = ctx.byId.get(kidId);
    if (kid) walkXml(kid, local, iter, ctx);
  }
}

function xmlTagFromSeg(seg: string): string {
  const cleaned = seg.replace(/\[\]$/, "").replace(/\[\*\]$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? cleaned;
}

function pluckXml(parent: unknown, tag: string): unknown {
  if (parent === null || parent === undefined) return undefined;
  if (typeof parent === "object") {
    const v = (parent as Record<string, unknown>)[tag];
    if (v !== undefined && typeof v === "object" && v !== null && !Array.isArray(v)) {
      const maybeText = (v as Record<string, unknown>)["#text"];
      if (maybeText !== undefined && Object.keys(v).length === 1) return maybeText;
    }
    return v;
  }
  return undefined;
}

// ─── CSV ─────────────────────────────────────────────────────────────
function walkCsv(
  nodes: SchemaNode[],
  parsed: { headers: string[]; rows: string[][] },
  values: ExtractResult["values"],
): void {
  // CSV schemas are flat — each leaf corresponds to one column by
  // position. We emit iteration 0 = first data row for now; multi-row
  // CSV sources would need the virtual-loop machinery mentioned above.
  const firstRow = parsed.rows[0] ?? [];
  const leaves = nodes.filter((n) => n.type === "el");
  leaves.forEach((leaf, idx) => {
    setValue(values, leaf.id, 0, firstRow[idx] ?? "");
  });
}

// ─── X12 ─────────────────────────────────────────────────────────────
/**
 * Loop-aware X12 extract. We first partition the raw segment stream by
 * loop boundaries, then walk each loop's iteration groups to populate
 * per-iteration leaf values.
 *
 * Loop-start tag: the EDI tag of a loop's FIRST leaf child. For the
 * Coyote 204's S5 loop whose first child is `S5*01`, the loop-start
 * tag is `S5`, and every S5 segment in the stream opens a new iteration.
 */
function walkX12(
  nodes: SchemaNode[],
  segments: X12Segment[],
  ctx: ExtractCtx,
): void {
  // Phase 1: extract scalar (non-loop-scoped) leaves from the first
  // matching segment.
  const loopStartsByTag = computeLoopStartTags(nodes);
  const tagToLoopAncestor = new Map<string, string>();
  for (const [tag, loopId] of loopStartsByTag) {
    tagToLoopAncestor.set(tag, loopId);
  }

  // First pass: scalar leaves — picking the first segment for their tag.
  for (const node of nodes) {
    if (node.type !== "el") continue;
    const parsed = parseX12Seg(node.seg);
    if (!parsed) continue;
    const loopAncestor = ctx.leafToLoop.get(node.id) ?? null;
    if (loopAncestor !== null) continue; // handled in the loop pass
    const { tag, elIdx } = parsed;
    const first = segments.find((s) => s.tag === tag);
    if (!first) continue;
    setValue(ctx.values, node.id, 0, first.elements[elIdx] ?? "");
  }

  // Second pass: loop-scoped leaves — partition segments by loop-start tag.
  for (const [loopStartTag, loopId] of loopStartsByTag) {
    const loopNode = ctx.byId.get(loopId);
    if (!loopNode) continue;
    const iterations = partitionByLoopStart(segments, loopStartTag, ctx, loopStartsByTag);
    ctx.loopIterationCount.set(
      loopId,
      Math.max(ctx.loopIterationCount.get(loopId) ?? 0, iterations.length),
    );

    iterations.forEach((iterSegs, iterIdx) => {
      for (const leaf of collectLoopLeaves(loopNode, ctx)) {
        const parsed = parseX12Seg(leaf.seg);
        if (!parsed) continue;
        const { tag, elIdx } = parsed;
        const match = iterSegs.find((s) => s.tag === tag);
        if (match) {
          setValue(ctx.values, leaf.id, iterIdx, match.elements[elIdx] ?? "");
        }
      }
    });
  }
}

/** Leaves directly under this loop (skipping nested sub-loops for this pass). */
function collectLoopLeaves(loopNode: SchemaNode, ctx: ExtractCtx): SchemaNode[] {
  const out: SchemaNode[] = [];
  const stack: SchemaNode[] = [];
  for (const kidId of loopNode.kids ?? []) {
    const kid = ctx.byId.get(kidId);
    if (kid) stack.push(kid);
  }
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.type === "el") {
      out.push(n);
      continue;
    }
    if (n.type === "loop") continue; // skip nested loops — their leaves handled separately
    for (const kidId of n.kids ?? []) {
      const kid = ctx.byId.get(kidId);
      if (kid) stack.push(kid);
    }
  }
  return out;
}

/** For each loop node, the tag of its first leaf child → used as the
 * iteration-start marker in the raw segment stream. */
function computeLoopStartTags(nodes: SchemaNode[]): Map<string, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result = new Map<string, string>(); // tag -> loopId

  function firstLeafTag(loop: SchemaNode): string | null {
    for (const kidId of loop.kids ?? []) {
      const kid = byId.get(kidId);
      if (!kid) continue;
      if (kid.type === "el") {
        const parsed = parseX12Seg(kid.seg);
        if (parsed) return parsed.tag;
      }
      if (kid.type === "group") {
        const tag = firstLeafTag(kid);
        if (tag) return tag;
      }
    }
    return null;
  }

  for (const node of nodes) {
    if (node.type !== "loop") continue;
    const tag = firstLeafTag(node);
    if (tag && !result.has(tag)) result.set(tag, node.id);
  }
  return result;
}

/** Given a segment stream and a loop-start tag, return segment groups
 * — one per iteration. A group runs from a loop-start segment up to
 * (but not including) the next segment that starts a *different* loop
 * or another iteration of the same loop. */
function partitionByLoopStart(
  segments: X12Segment[],
  loopStartTag: string,
  _ctx: ExtractCtx,
  loopStartsByTag: Map<string, string>,
): X12Segment[][] {
  // Fast path: no segments with that tag → no iterations.
  if (!segments.some((s) => s.tag === loopStartTag)) return [];

  const iterations: X12Segment[][] = [];
  let current: X12Segment[] | null = null;
  for (const seg of segments) {
    if (seg.tag === loopStartTag) {
      if (current) iterations.push(current);
      current = [seg];
      continue;
    }
    if (current) {
      // Close the current iteration when we hit another loop-start tag
      // (any loop-start, not just this one) to avoid bleeding into a
      // subsequent loop.
      if (loopStartsByTag.has(seg.tag) && seg.tag !== loopStartTag) {
        iterations.push(current);
        current = null;
        continue;
      }
      current.push(seg);
    }
  }
  if (current) iterations.push(current);
  return iterations;
}

/** "B2*04" → { tag: "B2", elIdx: 3 }. Returns null for ill-formed segs. */
function parseX12Seg(seg: string): { tag: string; elIdx: number } | null {
  const m = seg.match(/^([A-Z0-9]+)\*(\d+)/);
  if (!m) return null;
  return { tag: m[1], elIdx: parseInt(m[2], 10) - 1 };
}

// ─── utils ───────────────────────────────────────────────────────────
function stringifyScalar(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") return undefined;
  return String(v);
}

export { topLevelNodes };
