/**
 * Target-payload emitters. Given the target schema tree and a map of
 * target-node-id → computed value, produces a formatted string.
 *
 * Loop support is flattened to one iteration per loop in Phase 2.3;
 * multi-iteration emission (repeating the loop body for each source
 * iteration) arrives in a later phase when the transform engine gains
 * loop-awareness.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { SchemaNode } from "../types";

export function emitTarget(
  descriptor: SchemaDescriptor,
  values: Map<string, string | undefined>,
): string {
  switch (descriptor.format) {
    case "json":
      return emitJson(descriptor, values);
    case "xml":
    case "otm_xml":
      return emitXml(descriptor, values);
    case "csv":
      return emitCsv(descriptor, values);
    default:
      return emitJson(descriptor, values);
  }
}

// ─── JSON ────────────────────────────────────────────────────────────
function emitJson(
  descriptor: SchemaDescriptor,
  values: Map<string, string | undefined>,
): string {
  const tops = topLevelNodes(descriptor.nodes);
  const obj: Record<string, unknown> = {};
  for (const n of tops) {
    const v = buildJson(n, descriptor.nodes, values);
    if (v !== undefined) obj[jsonKey(n)] = v;
  }
  return JSON.stringify(obj, null, 2);
}

function buildJson(
  node: SchemaNode,
  all: SchemaNode[],
  values: Map<string, string | undefined>,
): unknown {
  if (node.type === "el") {
    const v = values.get(node.id);
    return v === undefined ? undefined : v;
  }

  if (node.type === "loop") {
    const inner: Record<string, unknown> = {};
    for (const kidId of node.kids ?? []) {
      const kid = all.find((n) => n.id === kidId);
      if (!kid) continue;
      const v = buildJson(kid, all, values);
      if (v !== undefined) inner[jsonKey(kid)] = v;
    }
    return Object.keys(inner).length ? [inner] : undefined;
  }

  // group
  const obj: Record<string, unknown> = {};
  for (const kidId of node.kids ?? []) {
    const kid = all.find((n) => n.id === kidId);
    if (!kid) continue;
    const v = buildJson(kid, all, values);
    if (v !== undefined) obj[jsonKey(kid)] = v;
  }
  return Object.keys(obj).length ? obj : undefined;
}

function jsonKey(node: SchemaNode): string {
  // For JSON targets the seg is a dotted path; strip the leading dot and
  // array marker. For XML/CSV targets, fall back to the label.
  const seg = node.seg.replace(/^\./, "").replace(/\[\]$/, "");
  return seg || node.label;
}

// ─── XML ─────────────────────────────────────────────────────────────
function emitXml(
  descriptor: SchemaDescriptor,
  values: Map<string, string | undefined>,
): string {
  const tops = topLevelNodes(descriptor.nodes);
  const rootName = descriptor.txType ? descriptor.txType : "Root";
  const lines: string[] = [`<${rootName}>`];
  for (const n of tops) buildXml(n, descriptor.nodes, values, lines, 1);
  lines.push(`</${rootName}>`);
  return lines.join("\n");
}

function buildXml(
  node: SchemaNode,
  all: SchemaNode[],
  values: Map<string, string | undefined>,
  lines: string[],
  depth: number,
): void {
  const indent = "  ".repeat(depth);
  const tag = xmlLastTag(node.seg) || node.label;

  if (node.type === "el") {
    const v = values.get(node.id);
    if (v === undefined) return;
    lines.push(`${indent}<${tag}>${escapeXml(v)}</${tag}>`);
    return;
  }

  // group or loop — open a wrapping element, emit kids, close
  const childLines: string[] = [];
  for (const kidId of node.kids ?? []) {
    const kid = all.find((n) => n.id === kidId);
    if (kid) buildXml(kid, all, values, childLines, depth + 1);
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
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── CSV ─────────────────────────────────────────────────────────────
function emitCsv(
  descriptor: SchemaDescriptor,
  values: Map<string, string | undefined>,
): string {
  const leaves = descriptor.nodes.filter((n) => n.type === "el");
  const headers = leaves.map((n) => n.label);
  const row = leaves.map((n) => csvCell(values.get(n.id) ?? ""));
  return [headers.join(","), row.join(",")].join("\n");
}

function csvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// ─── utils ───────────────────────────────────────────────────────────
function topLevelNodes(nodes: SchemaNode[]): SchemaNode[] {
  const childIds = new Set<string>();
  for (const n of nodes) if (n.kids) for (const k of n.kids) childIds.add(k);
  return nodes.filter((n) => !childIds.has(n.id));
}
