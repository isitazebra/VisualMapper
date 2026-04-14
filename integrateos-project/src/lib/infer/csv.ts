import type { SchemaNode } from "../types";

/**
 * CSV sample inference. Uses the first row as the header and the second
 * row (if present) for example values. Returns a flat list of leaf nodes.
 */
export function inferCsvSchema(csv: string): SchemaNode[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const firstDataRow = lines.length > 1 ? parseCsvLine(lines[1]) : [];

  return headers.map((h, i) => ({
    id: `csv${i}`,
    seg: `Col ${colLetter(i)}`,
    label: h.trim() || `Column ${i + 1}`,
    d: 0,
    type: "el" as const,
    sample: firstDataRow[i] ?? "",
  }));
}

/** Minimal RFC-4180-ish parser — handles quoted fields and escaped quotes. */
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

/** A, B, …, Z, AA, AB, … — matches spreadsheet column lettering. */
function colLetter(idx: number): string {
  let n = idx;
  let result = "";
  while (true) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return result;
}
