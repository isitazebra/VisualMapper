/**
 * Walks a source schema tree alongside its parsed payload and records a
 * value for each leaf node into a Map keyed by node id. Values are scalar
 * strings for simple cases; loop iterations are flattened to their first
 * element in this MVP (Phase 2.3 does not yet handle multi-iteration
 * target emission).
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { SchemaNode } from "../types";
import type { ParsedSource, X12Segment } from "./parse";

export type ValueMap = Map<string, string | undefined>;

export function extractSourceValues(
  descriptor: SchemaDescriptor,
  parsed: ParsedSource,
): ValueMap {
  const values: ValueMap = new Map();
  const allNodes = descriptor.nodes;
  const tops = topLevelNodes(allNodes);

  switch (parsed.format) {
    case "json":
    case "jsonInferred":
      for (const top of tops) walkJson(top, allNodes, parsed.value, values);
      break;
    case "xml":
      for (const top of tops) walkXml(top, allNodes, parsed.value, values);
      break;
    case "csv":
      walkCsv(allNodes, parsed.value, values);
      break;
    case "x12":
      walkX12(allNodes, parsed.value, values);
      break;
  }
  return values;
}

export function topLevelNodes(nodes: SchemaNode[]): SchemaNode[] {
  const childIds = new Set<string>();
  for (const n of nodes) if (n.kids) for (const k of n.kids) childIds.add(k);
  return nodes.filter((n) => !childIds.has(n.id));
}

// ─── JSON ────────────────────────────────────────────────────────────
function walkJson(
  node: SchemaNode,
  all: SchemaNode[],
  parent: unknown,
  values: ValueMap,
): void {
  const key = jsonKeyFromSeg(node.seg);
  const local = pluckJson(parent, key);

  if (node.type === "el") {
    values.set(node.id, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    // Flatten to the first iteration.
    const first = Array.isArray(local) ? local[0] : local;
    for (const kidId of node.kids ?? []) {
      const kid = all.find((n) => n.id === kidId);
      if (kid) walkJson(kid, all, first, values);
    }
    return;
  }

  // group
  for (const kidId of node.kids ?? []) {
    const kid = all.find((n) => n.id === kidId);
    if (kid) walkJson(kid, all, local, values);
  }
}

function jsonKeyFromSeg(seg: string): string {
  // ".foo" / ".foo[]" / "." (root placeholder)
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
  all: SchemaNode[],
  parent: unknown,
  values: ValueMap,
): void {
  const tag = xmlTagFromSeg(node.seg);
  const local = pluckXml(parent, tag);

  if (node.type === "el") {
    values.set(node.id, stringifyScalar(local));
    return;
  }

  if (node.type === "loop") {
    const first = Array.isArray(local) ? local[0] : local;
    for (const kidId of node.kids ?? []) {
      const kid = all.find((n) => n.id === kidId);
      if (kid) walkXml(kid, all, first, values);
    }
    return;
  }

  // group
  for (const kidId of node.kids ?? []) {
    const kid = all.find((n) => n.id === kidId);
    if (kid) walkXml(kid, all, local, values);
  }
}

function xmlTagFromSeg(seg: string): string {
  // Inferred XML segs look like "Shipment/Origin/City"; take the last segment.
  const cleaned = seg.replace(/\[\]$/, "").replace(/\[\*\]$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? cleaned;
}

function pluckXml(parent: unknown, tag: string): unknown {
  if (parent === null || parent === undefined) return undefined;
  if (typeof parent === "object") {
    const v = (parent as Record<string, unknown>)[tag];
    // fast-xml-parser emits { "#text": "value" } for leaf elements with
    // attributes; pull the text out so leaf extractors see a scalar.
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
  values: ValueMap,
): void {
  // Our CSV schema uses column indices (0, 1, …) implied by ordering.
  const firstRow = parsed.rows[0] ?? [];
  const leaves = nodes.filter((n) => n.type === "el");
  leaves.forEach((leaf, idx) => {
    values.set(leaf.id, firstRow[idx] ?? "");
  });
}

// ─── X12 ─────────────────────────────────────────────────────────────
function walkX12(nodes: SchemaNode[], segments: X12Segment[], values: ValueMap): void {
  // Leaves have segs like "B2*04" — the tag is everything before "*", the
  // index is the number after. We track per-tag occurrence counters so
  // repeated segments (L11 #1 vs #2) go to different nodes based on
  // their seg suffix.
  const byTag = new Map<string, X12Segment[]>();
  for (const s of segments) {
    if (!s.tag) continue;
    const list = byTag.get(s.tag);
    if (list) list.push(s);
    else byTag.set(s.tag, [s]);
  }

  for (const node of nodes) {
    if (node.type !== "el") continue;
    const match = node.seg.match(/^([A-Z0-9]+)\*(\d+)/);
    if (!match) continue;
    const [, tag, elIdxStr] = match;
    const instances = byTag.get(tag);
    if (!instances || instances.length === 0) continue;
    const elIdx = parseInt(elIdxStr, 10) - 1; // 01 is elements[0]
    // Use the first occurrence — MVP simplification.
    const value = instances[0].elements[elIdx] ?? "";
    values.set(node.id, value);
  }
}

// ─── utils ───────────────────────────────────────────────────────────
function stringifyScalar(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") return undefined;
  return String(v);
}
