import type { NodeType, SchemaNode } from "../types";

/** Terse node constructor — mirrors the prototype's `N(...)` helper. */
export function node(
  id: string,
  seg: string,
  label: string,
  d: number,
  type: NodeType,
  extra: Partial<SchemaNode> = {},
): SchemaNode {
  return { id, seg, label, d, type, ...extra };
}
