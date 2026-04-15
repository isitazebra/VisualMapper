/**
 * Alert evaluation entry-point — stub until Phase 4.5 lands the
 * AlertRule / AlertEvent models, the evaluation logic, and webhook
 * delivery. executeEndpoint already calls us fire-and-forget so the
 * stub is safe and the upgrade drops in cleanly.
 */
import type { Endpoint } from "@prisma/client";

export async function evaluateAlertsForRun(
  _runId: string,
  _endpoint: Endpoint,
  _finalStatus: string,
): Promise<void> {
  // no-op until Phase 4.5
}
