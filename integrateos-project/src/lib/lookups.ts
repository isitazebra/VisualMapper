/**
 * Shared helpers for the LookupTable feature. Used by both the create/
 * edit UI (parseEntries, formatEntries) and the transform engine (the
 * flattened Map<name, Record<key, value>> shape).
 */

/** Parses user-supplied text into a key→value map. Accepts two formats:
 *  - JSON object: `{ "US": "USA", "CA": "CAN" }`
 *  - "key=value" per line (anything that doesn't start with `{`)
 *
 * Returns either the parsed map or a string error for display. */
export function parseEntries(text: string): Record<string, string> | string {
  const trimmed = text.trim();
  if (!trimmed) return "Entries are empty.";

  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return "JSON entries must be a flat object of keys → values.";
      }
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v !== null && typeof v !== "object") {
          result[k] = String(v);
        } else {
          return `Value for key "${k}" must be a scalar.`;
        }
      }
      return result;
    } catch (err) {
      return `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const result: Record<string, string> = {};
  const lines = trimmed.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) return `Line "${line}" is missing an '=' separator.`;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) return `Empty key on line "${line}".`;
    result[key] = value;
  }
  if (Object.keys(result).length === 0) return "No entries parsed.";
  return result;
}

/** Render an entries map back to the "key=value" plaintext shape used
 * as the default input format. */
export function formatEntriesAsLines(entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

/** Narrow guard: distinguishes the parseEntries success vs. error return. */
export function isEntriesMap(
  v: Record<string, string> | string,
): v is Record<string, string> {
  return typeof v !== "string";
}
