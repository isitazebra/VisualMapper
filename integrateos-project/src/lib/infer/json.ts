import type { SchemaNode } from "../types";
import { makeIdGen, trimSample } from "./util";

/**
 * JSON sample inference. Produces a SchemaNode tree that mirrors the
 * sample's structure:
 *  - Primitives → leaves (el) with a sample value
 *  - Objects → groups; children recurse
 *  - Arrays → loops; the first element's structure defines the loop body
 *
 * The outermost object is "unwrapped" — its keys become top-level nodes
 * rather than being nested under a synthetic root. Top-level arrays are
 * wrapped in a single root loop.
 */
export function inferJsonSchema(sample: string): SchemaNode[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sample);
  } catch (err) {
    throw new Error(
      `Could not parse JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const nodes: SchemaNode[] = [];
  const nextId = makeIdGen("j");

  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    // Unwrap the outer object so users see their actual field names at depth 0.
    for (const [key, value] of Object.entries(parsed)) {
      walk(value, 0, key, `.${key}`, nodes, nextId);
    }
  } else {
    walk(parsed, 0, "root", ".", nodes, nextId);
  }

  return nodes;
}

function walk(
  value: unknown,
  depth: number,
  key: string,
  segPath: string,
  nodes: SchemaNode[],
  nextId: () => string,
): string {
  const id = nextId();

  // Primitive or null
  if (value === null || value === undefined || typeof value !== "object") {
    nodes.push({
      id,
      seg: segPath,
      label: key,
      d: depth,
      type: "el",
      sample: trimSample(value),
    });
    return id;
  }

  // Array — loop
  if (Array.isArray(value)) {
    const kids: string[] = [];
    nodes.push({
      id,
      seg: `${segPath}[]`,
      label: key,
      d: depth,
      type: "loop",
      kids,
      max: "N",
    });
    if (value.length > 0) {
      const first = value[0];
      if (first !== null && typeof first === "object" && !Array.isArray(first)) {
        for (const [k, v] of Object.entries(first as Record<string, unknown>)) {
          kids.push(walk(v, depth + 1, k, `.${k}`, nodes, nextId));
        }
      } else {
        // Scalar or nested array — one leaf per loop iteration
        const childId = nextId();
        nodes.push({
          id: childId,
          seg: "[*]",
          label: "value",
          d: depth + 1,
          type: "el",
          sample: trimSample(first),
        });
        kids.push(childId);
      }
    }
    return id;
  }

  // Plain object — group
  const kids: string[] = [];
  nodes.push({
    id,
    seg: segPath,
    label: key,
    d: depth,
    type: "group",
    kids,
  });
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    kids.push(walk(v, depth + 1, k, `.${k}`, nodes, nextId));
  }
  return id;
}
