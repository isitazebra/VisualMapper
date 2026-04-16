import type { SchemaNode } from "../types";
import { trimSample } from "./util";

/**
 * EDIFACT sample inference. Structurally identical to X12 inference:
 * every unique tag becomes a group, its elements become leaves. The
 * only differences are the delimiter characters: `+` for elements,
 * `'` for segment terminator, `?` as release/escape, and an optional
 * UNA service string advice prefix that overrides the defaults.
 *
 * Loop detection (recurring segments, nested UNH messages, etc.) is
 * deferred — this pass just enumerates segments.
 */
export function inferEdifactSchema(raw: string): SchemaNode[] {
  const { elSep, segSep, releaseChar, body } = readUna(raw);
  const segments = splitSegments(body, segSep, releaseChar);

  const nodes: SchemaNode[] = [];
  const counts = new Map<string, number>();
  let idCounter = 0;

  for (const segRaw of segments) {
    const parts = splitRespectingRelease(segRaw, elSep, releaseChar);
    const tag = parts[0];
    if (!tag) continue;
    const prev = counts.get(tag) ?? 0;
    counts.set(tag, prev + 1);

    const segId = `seg${idCounter++}`;
    const kids: string[] = [];
    nodes.push({
      id: segId,
      seg: prev === 0 ? tag : `${tag} (#${prev + 1})`,
      label: tag,
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

function readUna(raw: string): {
  elSep: string;
  segSep: string;
  releaseChar: string;
  body: string;
} {
  const trimmed = raw.trim();
  if (trimmed.startsWith("UNA") && trimmed.length >= 9) {
    return {
      elSep: trimmed[4] ?? "+",
      releaseChar: trimmed[6] ?? "?",
      segSep: trimmed[8] ?? "'",
      body: trimmed.slice(9),
    };
  }
  return { elSep: "+", releaseChar: "?", segSep: "'", body: trimmed };
}

function splitSegments(body: string, segSep: string, releaseChar: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === releaseChar && i + 1 < body.length) {
      current += body[i + 1];
      i++;
      continue;
    }
    if (c === segSep) {
      const s = current.trim();
      if (s) out.push(s);
      current = "";
      continue;
    }
    if (c === "\n" || c === "\r") continue;
    current += c;
  }
  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

function splitRespectingRelease(input: string, sep: string, releaseChar: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === releaseChar && i + 1 < input.length) {
      current += input[i + 1];
      i++;
      continue;
    }
    if (c === sep) {
      out.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  out.push(current);
  return out;
}
