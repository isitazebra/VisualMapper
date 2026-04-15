/**
 * Health / volume / error-rate aggregations computed from TransactionRun
 * rows over a configurable time window. No pre-aggregated metrics
 * table — for the traffic volumes we see in development this is fine;
 * real production would want a rolled-up metrics schema + materialized
 * views.
 */
import { prisma } from "./db";

export interface PartnerHealth {
  partnerId: string;
  partnerName: string;
  windowMin: number;
  total: number;
  delivered: number;
  transformed: number;
  failed: number;
  errorRate: number; // 0-1
  p50Ms: number | null;
  p95Ms: number | null;
  avgMs: number | null;
  /** Hourly volume buckets ordered oldest → newest (length = hours in window). */
  volumeByHour: number[];
  /** Recent failures for the "triage" list. */
  recentFailures: Array<{
    id: string;
    receivedAt: Date;
    errorStage: string | null;
    errorMessage: string | null;
    endpointName: string;
  }>;
}

/** Compute per-partner health rollup over the last `windowMin` minutes. */
export async function computePartnerHealth(
  windowMin = 60 * 24,
): Promise<PartnerHealth[]> {
  const since = new Date(Date.now() - windowMin * 60_000);
  const partners = await prisma.partner.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: PartnerHealth[] = [];
  for (const partner of partners) {
    const runs = await prisma.transactionRun.findMany({
      where: { partnerId: partner.id, receivedAt: { gte: since } },
      select: {
        id: true,
        status: true,
        receivedAt: true,
        durationMs: true,
        errorStage: true,
        errorMessage: true,
        endpoint: { select: { name: true } },
      },
      orderBy: { receivedAt: "desc" },
    });

    const total = runs.length;
    const delivered = runs.filter((r) => r.status === "delivered").length;
    const transformed = runs.filter((r) => r.status === "transformed").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const errorRate = total > 0 ? failed / total : 0;

    const durations = runs
      .map((r) => r.durationMs)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);
    const p50Ms = durations.length > 0 ? percentile(durations, 0.5) : null;
    const p95Ms = durations.length > 0 ? percentile(durations, 0.95) : null;
    const avgMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const volumeByHour = bucketByHour(runs.map((r) => r.receivedAt), since, windowMin);

    const recentFailures = runs
      .filter((r) => r.status === "failed")
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        receivedAt: r.receivedAt,
        errorStage: r.errorStage,
        errorMessage: r.errorMessage,
        endpointName: r.endpoint?.name ?? "",
      }));

    results.push({
      partnerId: partner.id,
      partnerName: partner.name,
      windowMin,
      total,
      delivered,
      transformed,
      failed,
      errorRate,
      p50Ms,
      p95Ms,
      avgMs,
      volumeByHour,
      recentFailures,
    });
  }
  return results;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

/** Counts per hourly bucket. Bucket 0 is the oldest (at `since`). */
function bucketByHour(times: Date[], since: Date, windowMin: number): number[] {
  const hours = Math.max(1, Math.ceil(windowMin / 60));
  const buckets = new Array(hours).fill(0);
  const base = since.getTime();
  for (const t of times) {
    const offset = t.getTime() - base;
    const idx = Math.min(hours - 1, Math.max(0, Math.floor(offset / (60 * 60_000))));
    buckets[idx]++;
  }
  return buckets;
}
