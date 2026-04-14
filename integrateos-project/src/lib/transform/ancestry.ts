/**
 * Schema ancestry helpers — build parent / loop-scope lookups used by
 * the loop-aware transform engine. Pure functions of the schema; cache
 * the result per schema descriptor.
 */
import type { SchemaNode } from "../types";

/** child id → parent id (missing for root nodes). */
export function buildParentMap(nodes: SchemaNode[]): Map<string, string> {
  const parentByChild = new Map<string, string>();
  for (const n of nodes) {
    if (n.kids) for (const k of n.kids) parentByChild.set(k, n.id);
  }
  return parentByChild;
}

/**
 * Nearest loop ancestor id for each node (or null if the node isn't in
 * any loop). Loops themselves map to themselves only when they're also
 * inside a parent loop — a top-level loop maps to null (no *outer*
 * loop scope).
 *
 * Precomputed once per schema.
 */
export function buildLoopAncestry(nodes: SchemaNode[]): Map<string, string | null> {
  const parent = buildParentMap(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result = new Map<string, string | null>();

  function walk(id: string): string | null {
    if (result.has(id)) return result.get(id) ?? null;
    const parentId = parent.get(id);
    if (!parentId) {
      result.set(id, null);
      return null;
    }
    const parentNode = byId.get(parentId);
    if (!parentNode) {
      result.set(id, null);
      return null;
    }
    // If the *parent* is a loop, that's our loop scope.
    if (parentNode.type === "loop") {
      result.set(id, parentNode.id);
      return parentNode.id;
    }
    // Otherwise keep walking up.
    const up = walk(parentId);
    result.set(id, up);
    return up;
  }

  for (const n of nodes) walk(n.id);
  return result;
}

/** All descendant leaves (type === "el") under `root`, recursive. */
export function descendantLeaves(
  root: SchemaNode,
  nodes: SchemaNode[],
): SchemaNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: SchemaNode[] = [];
  const stack: SchemaNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "el" && node !== root) {
      out.push(node);
      continue;
    }
    for (const kidId of node.kids ?? []) {
      const kid = byId.get(kidId);
      if (kid) stack.push(kid);
    }
  }
  return out;
}

/** Top-level nodes (no parent in the schema). */
export function topLevelNodes(nodes: SchemaNode[]): SchemaNode[] {
  const parent = buildParentMap(nodes);
  return nodes.filter((n) => !parent.has(n.id));
}
