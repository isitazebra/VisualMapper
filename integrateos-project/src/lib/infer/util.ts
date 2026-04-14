/** Counter-backed id generator — ensures unique, deterministic ids per inference run. */
export function makeIdGen(prefix = "n"): () => string {
  let counter = 0;
  return () => `${prefix}${counter++}`;
}

/** Truncate long sample values shown in the UI. */
export function trimSample(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return s.length > 64 ? s.slice(0, 61) + "…" : s;
}
