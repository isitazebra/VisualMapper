import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeEndpoint } from "@/lib/runtime/execute";

/**
 * POST /api/runs/bulk
 *
 * Body: { action: "replay" | "resolve" | "unresolve"; ids: string[]; note?: string }
 *
 *  - replay: re-run each selected run's stored input through its
 *    endpoint's *current* mapping. Produces N new TransactionRun rows;
 *    originals stay in place so the before/after is preserved.
 *  - resolve: mark the selected runs as resolved (with an optional
 *    note). Used to clear the exception queue after a human fix.
 *  - unresolve: reopen runs that were resolved in error.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const action = body?.action as string | undefined;
  const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
  const note = typeof body?.note === "string" ? body.note : undefined;

  if (!action || !["replay", "resolve", "unresolve"].includes(action)) {
    return NextResponse.json(
      { error: "action must be replay | resolve | unresolve" },
      { status: 400 },
    );
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids must be non-empty" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json(
      { error: "bulk action limited to 100 ids per request" },
      { status: 400 },
    );
  }

  if (action === "resolve" || action === "unresolve") {
    const updated = await prisma.transactionRun.updateMany({
      where: { id: { in: ids } },
      data: {
        resolved: action === "resolve",
        resolvedAt: action === "resolve" ? new Date() : null,
        resolvedNote: action === "resolve" ? (note ?? null) : null,
      },
    });
    return NextResponse.json({ ok: true, updatedCount: updated.count });
  }

  // Replay: iterate, executing each run's stored payload against its
  // endpoint's current mapping. Done sequentially to avoid hammering
  // downstream systems on forward-mode endpoints.
  const replayed: Array<{ originalId: string; newRunId: string; status: string }> = [];
  const failed: Array<{ originalId: string; error: string }> = [];

  for (const id of ids) {
    const original = await prisma.transactionRun.findUnique({
      where: { id },
      include: { endpoint: true },
    });
    if (!original) {
      failed.push({ originalId: id, error: "run not found" });
      continue;
    }
    if (!original.endpoint) {
      failed.push({ originalId: id, error: "endpoint deleted" });
      continue;
    }
    try {
      const result = await executeEndpoint(original.endpoint, original.inputPayload);
      replayed.push({
        originalId: id,
        newRunId: result.runId,
        status: result.status,
      });
    } catch (err) {
      failed.push({
        originalId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    replayed,
    failed,
    summary: {
      total: ids.length,
      succeeded: replayed.filter((r) => r.status === "delivered").length,
      failedReplay: failed.length,
      newFailures: replayed.filter((r) => r.status === "failed").length,
    },
  });
}
