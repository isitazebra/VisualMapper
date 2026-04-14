import type { SchemaNode } from "../types";
import { trimSample } from "./util";

/**
 * X12 sample inference. Parses a raw X12 payload (e.g. from a text paste)
 * by splitting on the segment terminator (`~` or newline) and the element
 * separator (`*`).
 *
 * Each unique segment tag becomes a group. If a segment appears more than
 * once it's labeled with a running count (`L11 (#2)`, `L11 (#3)`, …) — we
 * don't try to auto-detect loops here; that's an upgrade for Phase 3.
 *
 * The element-separator character is read from the ISA segment (position
 * 4 of ISA is always the element separator) when present, otherwise we
 * default to "*".
 */
export function inferX12Schema(raw: string): SchemaNode[] {
  const elSep = detectElementSeparator(raw);
  const segSep = detectSegmentSeparator(raw);

  // Normalize to segment boundaries and drop blank lines.
  const segments = raw
    .split(new RegExp(`[${escapeRe(segSep)}\\n\\r]+`))
    .map((s) => s.trim())
    .filter(Boolean);

  const nodes: SchemaNode[] = [];
  const counts = new Map<string, number>();
  let idCounter = 0;

  for (const raw of segments) {
    const parts = raw.split(elSep);
    const tag = parts[0];
    if (!tag) continue;

    const prev = counts.get(tag) ?? 0;
    counts.set(tag, prev + 1);

    const segId = `seg${idCounter++}`;
    const kids: string[] = [];
    nodes.push({
      id: segId,
      seg: prev === 0 ? tag : `${tag} (#${prev + 1})`,
      label: humanLabel(tag),
      d: 0,
      type: "group",
      kids,
    });

    for (let i = 1; i < parts.length; i++) {
      const elId = `el${idCounter++}`;
      nodes.push({
        id: elId,
        seg: `${tag}*${String(i).padStart(2, "0")}`,
        label: `Element ${i}`,
        d: 1,
        type: "el",
        sample: trimSample(parts[i]),
      });
      kids.push(elId);
    }
  }

  return nodes;
}

function detectElementSeparator(raw: string): string {
  // Standard X12: ISA is fixed-width up to position 3 (ISA), then element
  // separator at position 3 (zero-indexed). If raw doesn't start with ISA
  // fall back to "*".
  if (raw.length > 3 && raw.startsWith("ISA")) {
    return raw[3] ?? "*";
  }
  return "*";
}

function detectSegmentSeparator(raw: string): string {
  // Standard X12: segment terminator is 1–2 chars after the 106-char ISA
  // (inclusive) header. A common approximation is "the first ~" or "the
  // char at offset 105 of the ISA segment". We try a few likely candidates.
  if (raw.includes("~")) return "~";
  if (raw.includes("\n")) return "\n";
  return "~";
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pretty-prints a tag as a human-ish label. */
function humanLabel(tag: string): string {
  // Leave most tags alone; the seg column already shows the tag verbatim.
  return tag;
}
