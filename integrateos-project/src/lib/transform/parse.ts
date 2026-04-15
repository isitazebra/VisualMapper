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
