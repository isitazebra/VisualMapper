/**
 * Alert evaluation. Called fire-and-forget by executeEndpoint after
 * every terminal state. Looks up active AlertRules in scope (endpoint /
 * partner / global), checks each one's condition against the rolling
 * window, and fires the channel (webhook) when the threshold is
 * breached. Cooldown == windowMin so we don't spam the receiver.
 *
 * Conditions:
 *  - "error_rate_over": failed/total ≥ threshold (threshold is 0..1)
 *  - "failure_count":   failed ≥ threshold
 *  - "volume_drop":     total < threshold (alerts on missing traffic)
 */
import type { AlertRule, Endpoint, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function evaluateAlertsForRun(
  runId: string,
  endpoint: Endpoint,
  finalStatus: string,
): Promise<void> {
  try {
    const rules = await prisma.alertRule.findMany({
      where: {
        active: true,
        OR: [
          { endpointId: endpoint.id },
          { partnerId: endpoint.partnerId, endpointId: null },
          { partnerId: null, endpointId: null },
        ],
      },
    });
    if (rules.length === 0) return;
    for (const rule of rules) {
      await evaluateRule(rule, endpoint, finalStatus, runId);
    }
  } catch {
    // Alert evaluation must never crash the pipeline.
  }
}

async function evaluateRule(
  rule: AlertRule,
  endpoint: Endpoint,
  finalStatus: string,
  runId: string,
): Promise<void> {
  // Cooldown: don't re-fire the same rule within its own time window.
  if (rule.lastTriggeredAt) {
    const cooldownMs = rule.windowMin * 60_000;
    if (Date.now() - rule.lastTriggeredAt.getTime() < cooldownMs) return;
  }

  const since = new Date(Date.now() - rule.windowMin * 60_000);
  const scopeWhere = rule.endpointId
    ? { endpointId: rule.endpointId, receivedAt: { gte: since } }
    : rule.partnerId
      ? { partnerId: rule.partnerId, receivedAt: { gte: since } }
      : { receivedAt: { gte: since } };

  const [total, failed] = await Promise.all([
    prisma.transactionRun.count({ where: scopeWhere }),
    prisma.transactionRun.count({ where: { ...scopeWhere, status: "failed" } }),
  ]);

  let breached = false;
  let summary = "";
  switch (rule.condition) {
    case "error_rate_over": {
      if (total === 0) break;
      const rate = failed / total;
      if (rate >= rule.threshold) {
        breached = true;
        summary = `Error rate ${(rate * 100).toFixed(1)}% ≥ ${(
          rule.threshold * 100
        ).toFixed(0)}% over last ${rule.windowMin}m (${failed}/${total})`;
      }
      break;
    }
    case "failure_count": {
      if (failed >= rule.threshold) {
        breached = true;
        summary = `${failed} failures in last ${rule.windowMin}m ≥ ${rule.threshold}`;
      }
      break;
    }
    case "volume_drop": {
      if (total < rule.threshold) {
        breached = true;
        summary = `Only ${total} transactions in last ${rule.windowMin}m (expected ≥ ${rule.threshold})`;
      }
      break;
    }
    default:
      return;
  }

  if (!breached) return;

  const payload = {
    ruleName: rule.name,
    condition: rule.condition,
    threshold: rule.threshold,
    windowMin: rule.windowMin,
    total,
    failed,
    endpoint: { id: endpoint.id, name: endpoint.name },
    finalStatus,
    runId,
    firedAt: new Date().toISOString(),
  };

  await prisma.alertEvent.create({
    data: {
      ruleId: rule.id,
      summary,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
    },
  });
  await prisma.alertRule.update({
    where: { id: rule.id },
    data: { lastTriggeredAt: new Date() },
  });

  if (rule.channel === "webhook" && rule.webhookUrl) {
    try {
      await fetch(rule.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, ...payload }),
      });
    } catch {
      // Webhook delivery failure is silent — the AlertEvent row is
      // still persisted for audit.
    }
  }
}
