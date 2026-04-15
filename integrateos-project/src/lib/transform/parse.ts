/**
 * Parse a source payload into a format-specific intermediate
 * representation that the extractor understands.
 *
 * All four parsers throw on malformed input; callers should catch and
 * surface the error inline.
 */
import { XMLParser } from "fast-xml-parser";
import type { SchemaFormat } from "../schemas/registry";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export interface X12Segment {
  tag: string;
  elements: string[];
}

/** Discriminated union of parsed sources. */
export type ParsedSource =
  | { format: "json" | "jsonInferred"; value: unknown }
  | { format: "xml"; value: Record<string, unknown> }
  | { format: "csv"; value: ParsedCsv }
  | {
      format: "x12";
      value: X12Segment[];
      /** When the raw payload contained multiple ST/SE pairs within one
       * GS/GE (a "functional group"), this holds each transaction as
       * its own segment list. Each list is prefixed with the shared
       * envelope segments (ISA/GS/IEA/GE) so it's self-contained for
       * the extractor. Undefined when the payload has ≤1 transaction. */
      transactions?: X12Segment[][];
    }
  | {
      format: "edifact";
      /** Parsed segments use the same shape as X12 — a list of
       * { tag, elements } — so the downstream extractor/emit share
       * code paths. Segment tags are 3-letter EDIFACT codes. */
      value: X12Segment[];
      transactions?: X12Segment[][];
    };

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export function parseSource(format: SchemaFormat, raw: string): ParsedSource {
  switch (format) {
    case "json":
      return { format: "json", value: JSON.parse(raw) };
    case "xml":
    case "otm_xml":
      return { format: "xml", value: xmlParser.parse(raw) };
    case "csv":
      return { format: "csv", value: parseCsv(raw) };
    case "x12": {
      const segments = parseX12(raw);
      const transactions = splitByStSe(segments);
      return transactions.length > 1
        ? { format: "x12", value: segments, transactions }
        : { format: "x12", value: segments };
    }
    case "edifact": {
      const segments = parseEdifact(raw);
      const transactions = splitByUnhUnt(segments);
      return transactions.length > 1
        ? { format: "edifact", value: segments, transactions }
        : { format: "edifact", value: segments };
    }
    default:
      throw new Error(`Unsupported source format: ${format}`);
  }
}

function parseCsv(raw: string): ParsedCsv {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length > 0);
  const parsedRows = lines.map(parseCsvLine);
  return {
    headers: parsedRows[0] ?? [],
    rows: parsedRows.slice(1),
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function parseX12(raw: string): X12Segment[] {
  // Element separator comes from ISA*04 (char at position 3 of the ISA
  // segment) when present; otherwise "*".
  const elSep = raw.length > 3 && raw.startsWith("ISA") ? (raw[3] ?? "*") : "*";
  const rawSegments = raw
    .split(/[~\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return rawSegments.map((segRaw) => {
    const parts = segRaw.split(elSep);
    return { tag: parts[0] ?? "", elements: parts.slice(1) };
  });
}

/**
 * EDIFACT parser. Respects the UNA service string advice at the top
 * (optional) which defines the separators; otherwise uses the defaults:
 *   component separator : element separator + decimal "." release "?"
 *   reserved " " segment terminator '
 *
 * Release character (default "?") escapes the next char so it doesn't
 * act as a separator — standard EDIFACT escaping.
 */
function parseEdifact(raw: string): X12Segment[] {
  const trimmed = raw.trim();
  let elSep = "+";
  let segSep = "'";
  let releaseChar = "?";
  let start = 0;

  if (trimmed.startsWith("UNA") && trimmed.length >= 9) {
    // UNA is exactly 9 chars: "UNA" + 6 service chars.
    // Position 3 = component sep, 4 = element sep, 5 = decimal,
    // 6 = release, 7 = reserved, 8 = segment terminator.
    elSep = trimmed[4] ?? "+";
    releaseChar = trimmed[6] ?? "?";
    segSep = trimmed[8] ?? "'";
    start = 9;
  }

  const segments: string[] = [];
  let current = "";
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === releaseChar && i + 1 < trimmed.length) {
      current += trimmed[i + 1];
      i++;
      continue;
    }
    if (c === segSep) {
      const s = current.trim();
      if (s) segments.push(s);
      current = "";
      continue;
    }
    // Collapse newlines and surrounding whitespace — EDIFACT segments
    // are usually on one line but samples often have pretty-printing.
    if (c === "\n" || c === "\r") continue;
    current += c;
  }
  const tail = current.trim();
  if (tail) segments.push(tail);

  return segments.map((segRaw) => {
    const parts = splitRespectingRelease(segRaw, elSep, releaseChar);
    return { tag: parts[0] ?? "", elements: parts.slice(1) };
  });
}

function splitRespectingRelease(
  input: string,
  sep: string,
  releaseChar: string,
): string[] {
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

/** EDIFACT analog of splitByStSe — UNH opens a message, UNT closes it.
 * Envelope segments (UNA, UNB, UNG, UNE, UNZ) prefix every returned
 * transaction. */
function splitByUnhUnt(segs: X12Segment[]): X12Segment[][] {
  const unhIdxs: number[] = [];
  const untIdxs: number[] = [];
  segs.forEach((s, i) => {
    if (s.tag === "UNH") unhIdxs.push(i);
    if (s.tag === "UNT") untIdxs.push(i);
  });

  if (unhIdxs.length === 0) return [segs];
  if (unhIdxs.length !== untIdxs.length) return [segs];

  const envelope: X12Segment[] = [];
  let inTx = false;
  for (const seg of segs) {
    if (seg.tag === "UNH") {
      inTx = true;
      continue;
    }
    if (seg.tag === "UNT") {
      inTx = false;
      continue;
    }
    if (!inTx) envelope.push(seg);
  }
  const out: X12Segment[][] = [];
  for (let k = 0; k < unhIdxs.length; k++) {
    const start = unhIdxs[k];
    const end = untIdxs[k];
    if (end < start) return [segs];
    out.push([...envelope, ...segs.slice(start, end + 1)]);
  }
  return out;
}

/**
 * Splits a flat X12 segment stream into one list per ST/SE pair,
 * prefixed with the shared envelope segments. Returns a single-element
 * array when there's only one transaction (the common case).
 *
 * A "transaction" = ST + body + SE. "Envelope" = any segment seen
 * outside an ST..SE block (ISA / GS / GE / IEA). Every returned list
 * looks like [...envelope, ST, ...body, SE] so the downstream
 * extractor has full context.
 */
function splitByStSe(segs: X12Segment[]): X12Segment[][] {
  const stIndexes: number[] = [];
  const seIndexes: number[] = [];
  segs.forEach((s, i) => {
    if (s.tag === "ST") stIndexes.push(i);
    if (s.tag === "SE") seIndexes.push(i);
  });

  if (stIndexes.length === 0) return [segs];
  if (stIndexes.length !== seIndexes.length) return [segs]; // malformed → pass through

  const envelope: X12Segment[] = [];
  let inTx = false;
  for (const seg of segs) {
    if (seg.tag === "ST") {
      inTx = true;
      continue;
    }
    if (seg.tag === "SE") {
      inTx = false;
      continue;
    }
    if (!inTx) envelope.push(seg);
  }

  const out: X12Segment[][] = [];
  for (let k = 0; k < stIndexes.length; k++) {
    const start = stIndexes[k];
    const end = seIndexes[k];
    if (end < start) return [segs]; // malformed
    const body = segs.slice(start, end + 1);
    out.push([...envelope, ...body]);
  }
  return out;
}
