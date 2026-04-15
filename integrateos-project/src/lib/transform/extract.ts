/**
 * Loop-aware extract. Produces a tree where each loop iteration has
 * its own leafValues map and its own subLoops, so nested loops (e.g.
 * S5-stops containing L11-refs distinct from the header L11 loop) get
 * disambiguated correctly.
 *
 * Emit consumes this tree by walking the target schema alongside an
 * active loop stack, resolving source values from the innermost
 * matching iteration.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { SchemaNode } from "../types";
import type { ParsedSource, X12Segment } from "./parse";
import { buildLoopAncestry, topLevelNodes } from "./ancestry";

/** A single iteration of a loop. Holds direct-child leaf values and
 * zero-or-more nested loops (each with their own iteration list). */
export interface IterationNode {
  leafValues: Map<string, string | undefined>;
  subLoops: Map<string, IterationNode[]>;
}

export interface ExtractResult {
  /** Leaf values that live outside any loop. */
  rootLeaves: Map<string, string | undefined>;
  /** Top-level loops keyed by the loop node's id. */
  rootLoops: Map<string, IterationNode[]>;
  /** Each schema node's nearest loop ancestor (or null). */
  leafToLoop: Map<string, string | null>;
}

function emptyIter(): IterationNode {
  return { leafValues: new Map(), subLoops: new Map() };
}

export function extractSourceValues(
  descriptor: SchemaDescriptor,
  parsed: ParsedSource,
): ExtractResult {
  const leafToLoop = buildLoopAncestry(descriptor.nodes);
  const result: ExtractResult = {
    rootLeaves: new Map(),
    rootLoops: new Map(),
    leafToLoop,
  };
  const byId = new Map(descriptor.nodes.map((n) => [n.id, n]));

  switch (parsed.format) {
    case "json":
    case "jsonInferred": {
      const root = emptyIter();
      root.leafValues = result.rootLeaves;
      root.subLoops = result.rootLoops;
      for (const top of topLevelNodes(descriptor.nodes)) {
        walkJson(top, parsed.value, root, byId);
      }
      break;
    }
    case "xml": {
      const root = emptyIter();
      root.leafValues = result.rootLeaves;
      root.subLoops = result.rootLoops;
      for (const top of topLevelNodes(descriptor.nodes)) {
        walkXml(top, parsed.value, root, byId);
      }
      break;
    }
    case "csv":
      walkCsv(descriptor.nodes, parsed.value, result.rootLeaves);
      break;
    case "x12":
    case "edifact":
      // EDIFACT shares structure with X12 — same tagged-segment model
      // with elements at positional offsets. Extract logic is
      // identical; only the wire-level parsing differs (handled in
      // parseSource).
      walkX12(descriptor.nodes, parsed.value, result, byId);
      break;
  }

  return result;
}

// ─── JSON ────────────────────────────────────────────────────────────
function walkJson(
  node: SchemaNode,
  parent: unknown,
  into: IterationNode,
  byId: Map<string, SchemaNode>,
): void {
  const key = jsonKeyFromSeg(node.seg);
  const local = pluckJson(parent, key);

  if (node.type === "el") {
    into.leafValues.set(node.id, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    const items = Array.isArray(local) ? local : local === undefined ? [] : [local];
    const iters = items.map((item) => {
      const iter = emptyIter();
      for (const kidId of node.kids ?? []) {
        const kid = byId.get(kidId);
        if (kid) walkJson(kid, item, iter, byId);
      }
      return iter;
    });
    if (iters.length > 0) into.subLoops.set(node.id, iters);
    return;
  }

  // group
  for (const kidId of node.kids ?? []) {
    const kid = byId.get(kidId);
    if (kid) walkJson(kid, local, into, byId);
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
  into: IterationNode,
  byId: Map<string, SchemaNode>,
): void {
  const tag = xmlTagFromSeg(node.seg);
  const local = pluckXml(parent, tag);

  if (node.type === "el") {
    into.leafValues.set(node.id, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    const items = Array.isArray(local) ? local : local === undefined ? [] : [local];
    const iters = items.map((item) => {
      const iter = emptyIter();
      for (const kidId of node.kids ?? []) {
        const kid = byId.get(kidId);
        if (kid) walkXml(kid, item, iter, byId);
      }
      return iter;
    });
    if (iters.length > 0) into.subLoops.set(node.id, iters);
    return;
  }

  for (const kidId of node.kids ?? []) {
    const kid = byId.get(kidId);
    if (kid) walkXml(kid, local, into, byId);
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
  into: Map<string, string | undefined>,
): void {
  const firstRow = parsed.rows[0] ?? [];
  const leaves = nodes.filter((n) => n.type === "el");
  leaves.forEach((leaf, idx) => {
    into.set(leaf.id, firstRow[idx] ?? "");
  });
}

// ─── X12 — stack-aware, recursive ────────────────────────────────────
/**
 * Processes segments as a flat stream against a hierarchical schema.
 * Walk strategy: at any point we know which loop is "currently open"
 * and which loop's body tags we expect. When we see a tag that opens a
 * nested loop, recurse. When we see the loop's own start tag again,
 * start a new iteration. When we see a tag outside the current loop's
 * scope, return control to the parent.
 *
 * This handles the L11-in-header vs. L11-inside-S5 case correctly by
 * looking up the current loop's direct leaves first; L11 inside S5
 * resolves to sl111/sl112, while L11 at header level resolves to
 * hl101/hl102.
 */
function walkX12(
  nodes: SchemaNode[],
  segments: X12Segment[],
  result: ExtractResult,
  byId: Map<string, SchemaNode>,
): void {
  // Precompute each loop's metadata once.
  const loopMeta = buildLoopMeta(nodes, byId);

  // Root "virtual loop": treat top-level leaves as direct, top-level
  // loops as sub-loops.
  const rootLoops = topLevelLoops(nodes, byId);
  const rootLeavesByTag = directLeavesByTag(topLevelNodes(nodes), byId, loopMeta);
  const rootSubLoopStartTags = new Map<string, string>();
  for (const lid of rootLoops) {
    const meta = loopMeta.get(lid);
    if (meta) rootSubLoopStartTags.set(meta.startTag, lid);
  }

  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    const subLoopId = rootSubLoopStartTags.get(seg.tag);
    if (subLoopId) {
      // Consume all segments belonging to this root-level loop.
      const [iters, consumed] = consumeLoop(segments, i, subLoopId, loopMeta, byId);
      const existing = result.rootLoops.get(subLoopId) ?? [];
      result.rootLoops.set(subLoopId, [...existing, ...iters]);
      i += consumed;
      continue;
    }
    // Scalar root leaf?
    const leaves = rootLeavesByTag.get(seg.tag) ?? [];
    for (const leaf of leaves) {
      const parsed = parseX12Seg(leaf.seg);
      if (!parsed) continue;
      // Only assign if the leaf lives outside all loops.
      if (result.rootLeaves.get(leaf.id) === undefined) {
        result.rootLeaves.set(leaf.id, seg.elements[parsed.elIdx] ?? "");
      }
    }
    i++;
  }
}

interface LoopInfo {
  loopNode: SchemaNode;
  startTag: string;
  /** Loop's own bodyTag set (direct leaves' tags + direct sub-loops' start tags). */
  bodyTags: Set<string>;
  /** Direct leaves of this loop keyed by their tag. */
  leavesByTag: Map<string, SchemaNode[]>;
  /** Map from direct sub-loop start tag → child loopId. */
  subLoopStartTags: Map<string, string>;
}

function buildLoopMeta(
  nodes: SchemaNode[],
  byId: Map<string, SchemaNode>,
): Map<string, LoopInfo> {
  const result = new Map<string, LoopInfo>();
  for (const n of nodes) {
    if (n.type !== "loop") continue;
    const directLeaves = directDescendantLeaves(n, byId);
    const directSubLoops = directDescendantLoops(n, byId);
    const leavesByTag = new Map<string, SchemaNode[]>();
    const bodyTags = new Set<string>();
    for (const leaf of directLeaves) {
      const parsed = parseX12Seg(leaf.seg);
      if (!parsed) continue;
      bodyTags.add(parsed.tag);
      const list = leavesByTag.get(parsed.tag) ?? [];
      list.push(leaf);
      leavesByTag.set(parsed.tag, list);
    }
    const subLoopStartTags = new Map<string, string>();
    for (const sub of directSubLoops) {
      const startTag = firstLeafTag(sub, byId);
      if (startTag) {
        subLoopStartTags.set(startTag, sub.id);
        bodyTags.add(startTag);
      }
    }
    const ownStart = firstLeafTag(n, byId) ?? "";
    result.set(n.id, {
      loopNode: n,
      startTag: ownStart,
      bodyTags,
      leavesByTag,
      subLoopStartTags,
    });
  }
  return result;
}

/**
 * Consumes segments starting at `start` that belong to one or more
 * iterations of the loop identified by `loopId`. Returns the
 * iterations and the number of segments consumed. Stops at the first
 * segment whose tag is outside the loop's body.
 */
function consumeLoop(
  segments: X12Segment[],
  start: number,
  loopId: string,
  loopMeta: Map<string, LoopInfo>,
  byId: Map<string, SchemaNode>,
): [IterationNode[], number] {
  const meta = loopMeta.get(loopId);
  if (!meta) return [[], 0];
  const iters: IterationNode[] = [];
  let i = start;
  let current: IterationNode | null = null;
  while (i < segments.length) {
    const seg = segments[i];
    // Open a new iteration on the loop-start tag.
    if (seg.tag === meta.startTag) {
      // If there's already a current iter, finalize it before starting anew.
      if (current) iters.push(current);
      current = emptyIter();
      // Extract the start segment itself into the new iter.
      applySegmentToIter(seg, meta, current);
      i++;
      continue;
    }
    // Inside a current iteration?
    if (current) {
      // Is this tag a sub-loop start? Recurse.
      const subLoopId = meta.subLoopStartTags.get(seg.tag);
      if (subLoopId) {
        const [subIters, consumed] = consumeLoop(segments, i, subLoopId, loopMeta, byId);
        if (subIters.length > 0) {
          const existing = current.subLoops.get(subLoopId) ?? [];
          current.subLoops.set(subLoopId, [...existing, ...subIters]);
        }
        i += consumed;
        continue;
      }
      // Is this tag a direct leaf of the current loop?
      if (meta.leavesByTag.has(seg.tag)) {
        applySegmentToIter(seg, meta, current);
        i++;
        continue;
      }
    }
    // Tag is outside this loop's scope — return control to the caller.
    break;
  }
  if (current) iters.push(current);
  return [iters, i - start];
}

function applySegmentToIter(
  seg: X12Segment,
  meta: LoopInfo,
  iter: IterationNode,
): void {
  const leaves = meta.leavesByTag.get(seg.tag) ?? [];
  for (const leaf of leaves) {
    const parsed = parseX12Seg(leaf.seg);
    if (!parsed) continue;
    // Don't overwrite — if a tag occurs multiple times within one
    // iteration (e.g. two L11 sub-refs in the same stop), only the
    // first wins. Users can model that as a sub-loop for full
    // fidelity.
    if (!iter.leafValues.has(leaf.id)) {
      iter.leafValues.set(leaf.id, seg.elements[parsed.elIdx] ?? "");
    }
  }
}

// ─── schema helpers ──────────────────────────────────────────────────
function topLevelLoops(
  nodes: SchemaNode[],
  byId: Map<string, SchemaNode>,
): string[] {
  const tops = topLevelNodes(nodes);
  const out: string[] = [];
  function collect(n: SchemaNode) {
    if (n.type === "loop") {
      out.push(n.id);
      return; // don't descend into sub-loops at root level
    }
    for (const k of n.kids ?? []) {
      const kid = byId.get(k);
      if (kid) collect(kid);
    }
  }
  for (const t of tops) collect(t);
  return out;
}

function directDescendantLeaves(
  loop: SchemaNode,
  byId: Map<string, SchemaNode>,
): SchemaNode[] {
  const out: SchemaNode[] = [];
  const stack: SchemaNode[] = [];
  for (const k of loop.kids ?? []) {
    const kid = byId.get(k);
    if (kid) stack.push(kid);
  }
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.type === "el") out.push(n);
    else if (n.type === "group") {
      for (const k of n.kids ?? []) {
        const kid = byId.get(k);
        if (kid) stack.push(kid);
      }
    }
    // skip sub-loops — their leaves belong to the sub-loop
  }
  return out;
}

function directDescendantLoops(
  loop: SchemaNode,
  byId: Map<string, SchemaNode>,
): SchemaNode[] {
  const out: SchemaNode[] = [];
  const stack: SchemaNode[] = [];
  for (const k of loop.kids ?? []) {
    const kid = byId.get(k);
    if (kid) stack.push(kid);
  }
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.type === "loop") {
      out.push(n);
      continue;
    }
    for (const k of n.kids ?? []) {
      const kid = byId.get(k);
      if (kid) stack.push(kid);
    }
  }
  return out;
}

function firstLeafTag(
  node: SchemaNode,
  byId: Map<string, SchemaNode>,
): string | null {
  for (const k of node.kids ?? []) {
    const kid = byId.get(k);
    if (!kid) continue;
    if (kid.type === "el") {
      const parsed = parseX12Seg(kid.seg);
      if (parsed) return parsed.tag;
    }
    if (kid.type === "group") {
      const tag = firstLeafTag(kid, byId);
      if (tag) return tag;
    }
  }
  return null;
}

function directLeavesByTag(
  nodes: SchemaNode[],
  byId: Map<string, SchemaNode>,
  loopMeta: Map<string, LoopInfo>,
): Map<string, SchemaNode[]> {
  void loopMeta;
  const out = new Map<string, SchemaNode[]>();
  const stack: SchemaNode[] = [...nodes];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.type === "loop") continue; // skip — leaves inside loops aren't "root"
    if (n.type === "el") {
      const parsed = parseX12Seg(n.seg);
      if (parsed) {
        const list = out.get(parsed.tag) ?? [];
        list.push(n);
        out.set(parsed.tag, list);
      }
      continue;
    }
    for (const k of n.kids ?? []) {
      const kid = byId.get(k);
      if (kid) stack.push(kid);
    }
  }
  return out;
}

function parseX12Seg(seg: string): { tag: string; elIdx: number } | null {
  const m = seg.match(/^([A-Z0-9]+)\*(\d+)/);
  if (!m) return null;
  return { tag: m[1], elIdx: parseInt(m[2], 10) - 1 };
}

function stringifyScalar(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") return undefined;
  return String(v);
}

export { topLevelNodes };
