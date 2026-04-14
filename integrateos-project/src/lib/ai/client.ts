import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy Anthropic client — we avoid constructing it at module load so
 * builds don't fail when ANTHROPIC_API_KEY isn't set (e.g. during the
 * first Vercel deploy before the env var lands).
 */
let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your Vercel project's environment variables.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

/** Default model used for rule authoring. Sonnet is the right balance
 * of accuracy and latency for interactive tool-use. */
export const COMPOSE_MODEL = "claude-sonnet-4-6";

/** Default model for cheaper / faster operations (e.g. bulk auto-map
 * per-field scoring). */
export const FAST_MODEL = "claude-haiku-4-5-20251001";
