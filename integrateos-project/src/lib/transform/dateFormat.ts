/**
 * Date / time format conversion without a runtime dependency. Given a
 * rule value shaped like `"FROM->TO"` and a source string, parses the
 * string using FROM tokens and re-renders using TO tokens.
 *
 * Supported tokens (both in FROM and TO):
 *   YYYY  4-digit year
 *   YY    2-digit year (windowed: < 50 → 20xx; ≥ 50 → 19xx)
 *   MM    2-digit month
 *   DD    2-digit day
 *   HH    2-digit hour (24)
 *   mm    2-digit minute
 *   ss    2-digit second
 *
 * Special TO: `ISO` — emits YYYY-MM-DD, or YYYY-MM-DDTHH:MM:SS when
 * time components are present.
 *
 * Unknown formats: returns the source unchanged.
 */

const TOKENS = ["YYYY", "HH", "mm", "ss", "YY", "MM", "DD"] as const;
type Token = (typeof TOKENS)[number];

/** Build a regex from a format string, capturing each token's group. */
function buildRegex(format: string): { re: RegExp; tokens: Token[] } | null {
  let pattern = "";
  const tokens: Token[] = [];
  let i = 0;
  while (i < format.length) {
    let matchedToken = false;
    for (const tok of TOKENS) {
      if (format.substring(i, i + tok.length) === tok) {
        pattern += `(\\d{${tok.length}})`;
        tokens.push(tok);
        i += tok.length;
        matchedToken = true;
        break;
      }
    }
    if (!matchedToken) {
      // Escape literal characters so `/`, `-`, `:` etc. match themselves.
      pattern += format[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i++;
    }
  }
  try {
    return { re: new RegExp("^" + pattern + "$"), tokens };
  } catch {
    return null;
  }
}

export interface ParsedDate {
  YYYY?: string;
  YY?: string;
  MM?: string;
  DD?: string;
  HH?: string;
  mm?: string;
  ss?: string;
}

export function parseDate(value: string, format: string): ParsedDate | null {
  const compiled = buildRegex(format);
  if (!compiled) return null;
  const match = value.trim().match(compiled.re);
  if (!match) return null;
  const out: ParsedDate = {};
  compiled.tokens.forEach((tok, i) => {
    out[tok] = match[i + 1];
  });
  // Window 2-digit years to 4-digit.
  if (out.YY && !out.YYYY) {
    const yy = parseInt(out.YY, 10);
    out.YYYY = yy < 50 ? String(2000 + yy) : String(1900 + yy);
  }
  return out;
}

export function renderDate(parts: ParsedDate, format: string): string {
  if (format.toUpperCase() === "ISO") {
    const y = parts.YYYY ?? "1970";
    const m = parts.MM ?? "01";
    const d = parts.DD ?? "01";
    const h = parts.HH;
    const mi = parts.mm;
    const s = parts.ss;
    if (h !== undefined || mi !== undefined || s !== undefined) {
      return `${y}-${m}-${d}T${h ?? "00"}:${mi ?? "00"}:${s ?? "00"}`;
    }
    return `${y}-${m}-${d}`;
  }
  // Apply tokens longest-first so YYYY isn't clobbered by YY.
  let out = format;
  for (const tok of TOKENS) {
    const v = parts[tok];
    if (v !== undefined) out = out.split(tok).join(v);
  }
  return out;
}

/** Top-level: `applyDateFormat("20250318", "YYYYMMDD->ISO")` → "2025-03-18". */
export function applyDateFormat(
  value: string | undefined,
  spec: string | undefined,
): string | undefined {
  if (!value) return value;
  if (!spec) return value;
  const [from, to] = spec.split("->");
  if (!from || !to) return value;
  const parsed = parseDate(value, from);
  if (!parsed) return value;
  return renderDate(parsed, to);
}
