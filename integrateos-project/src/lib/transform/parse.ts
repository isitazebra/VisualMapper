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
  | { format: "x12"; value: X12Segment[] };

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
    case "x12":
      return { format: "x12", value: parseX12(raw) };
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
  // Segment terminator — we split on ~ OR newlines.
  const rawSegments = raw
    .split(/[~\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return rawSegments.map((segRaw) => {
    const parts = segRaw.split(elSep);
    return { tag: parts[0] ?? "", elements: parts.slice(1) };
  });
}
