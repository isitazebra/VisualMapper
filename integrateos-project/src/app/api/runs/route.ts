import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/runs — paginated transaction stream. Filters: partnerId,
 * endpointId, status, limit (default 50, max 200). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("partnerId");
  const endpointId = url.searchParams.get("endpointId");
  const status = url.searchParams.get("status");
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const runs = await prisma.transactionRun.findMany({
    where: {
      ...(partnerId ? { partnerId } : {}),
      ...(endpointId ? { endpointId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      endpointId: true,
      partnerId: true,
      mappingSpecId: true,
      inputSize: true,
      outputSize: true,
      mappedCount: true,
      unmappedCount: true,
      transactionCount: true,
      errorStage: true,
      errorMessage: true,
      egressStatus: true,
      receivedAt: true,
      durationMs: true,
      endpoint: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });
  return NextResponse.json(runs);
}
