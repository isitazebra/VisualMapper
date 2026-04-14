import { XMLParser } from "fast-xml-parser";
import type { SchemaNode } from "../types";
import { makeIdGen, trimSample } from "./util";

/**
 * XML sample inference. Uses fast-xml-parser's `preserveOrder` off so we
 * can walk the object representation directly.
 *
 * Rules:
 *  - Elements with a single primitive child (`{ "Id": "SH-123" }`) → leaf
 *  - Elements with object children → group; nested elements recurse
 *  - Elements that appear multiple times (array in the parsed tree) → loop
 *  - Attributes are emitted as leaves with a `@name` segment
 *
 * Text nodes inside groups (mixed content) are ignored for now.
 */
export function inferXmlSchema(xml: string): SchemaNode[] {
  let parsed: Record<string, unknown>;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
      parseTagValue: false, // keep samples as their original string form
      parseAttributeValue: false,
      trimValues: true,
    });
    parsed = parser.parse(xml);
  } catch (err) {
    throw new Error(
      `Could not parse XML: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const nodes: SchemaNode[] = [];
  const nextId = makeIdGen("x");

  // fast-xml-parser returns { rootElement: {...} }. Unwrap the root so its
  // children are the top-level nodes of our schema.
  for (const [rootTag, rootValue] of Object.entries(parsed)) {
    walk(rootValue, 0, rootTag, rootTag, nodes, nextId);
  }
  return nodes;
}

function walk(
  value: unknown,
  depth: number,
  tag: string,
  path: string,
  nodes: SchemaNode[],
  nextId: () => string,
): string {
  const id = nextId();

  // Leaf: scalar or null (attribute value or element text)
  if (value === null || value === undefined || typeof value !== "object") {
    nodes.push({
      id,
      seg: path,
      label: tag.replace(/^@/, ""),
      d: depth,
      type: "el",
      sample: trimSample(value),
    });
    return id;
  }

  // Repeated element — loop
  if (Array.isArray(value)) {
    const kids: string[] = [];
    nodes.push({
      id,
      seg: `${path}[]`,
      label: tag,
      d: depth,
      type: "loop",
      kids,
      max: "N",
    });
    const first = value[0];
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      for (const [k, v] of Object.entries(first as Record<string, unknown>)) {
        if (k === "#text") continue;
        const childTag = k.replace(/^@/, "");
        kids.push(walk(v, depth + 1, k, `${path}/${k}`, nodes, nextId));
        void childTag;
      }
    } else if (first !== undefined) {
      const childId = nextId();
      nodes.push({
        id: childId,
        seg: `${path}[*]`,
        label: tag,
        d: depth + 1,
        type: "el",
        sample: trimSample(first),
      });
      kids.push(childId);
    }
    return id;
  }

  // Plain object — treat as a group. Detect leaf-with-attributes: if the
  // only non-attribute key is "#text" we emit a leaf plus attribute siblings.
  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);
  const nonAttr = entries.filter(([k]) => !k.startsWith("@") && k !== "#text");

  if (nonAttr.length === 0 && Object.prototype.hasOwnProperty.call(obj, "#text")) {
    // <Foo attr="x">value</Foo>
    nodes.push({
      id,
      seg: path,
      label: tag.replace(/^@/, ""),
      d: depth,
      type: "el",
      sample: trimSample(obj["#text"]),
    });
    // Attribute siblings are emitted as leaves at the same depth (not as
    // children) so they show up in the tree next to their owning element.
    for (const [k, v] of entries) {
      if (!k.startsWith("@")) continue;
      const attrId = nextId();
      nodes.push({
        id: attrId,
        seg: `${path}/${k}`,
        label: k.slice(1),
        d: depth + 1,
        type: "el",
        sample: trimSample(v),
      });
    }
    return id;
  }

  // Group
  const kids: string[] = [];
  nodes.push({
    id,
    seg: path,
    label: tag.replace(/^@/, ""),
    d: depth,
    type: "group",
    kids,
  });
  for (const [k, v] of entries) {
    if (k === "#text") continue;
    kids.push(walk(v, depth + 1, k, `${path}/${k}`, nodes, nextId));
  }
  return id;
}
