import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/runs — paginated transaction stream. Filters: partnerId,
 * endpointId, status, q (free-text), limit (default 50, max 200). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("partnerId");
  const endpointId = url.searchParams.get("endpointId");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  // Free-text search: look at run id, payload content (input/output),
  // and the joined endpoint/partner names. Case-insensitive contains.
  const searchClause = q
    ? {
        OR: [
          { id: { contains: q } },
          { inputPayload: { contains: q, mode: "insensitive" as const } },
          { outputPayload: { contains: q, mode: "insensitive" as const } },
          { errorMessage: { contains: q, mode: "insensitive" as const } },
          { endpoint: { name: { contains: q, mode: "insensitive" as const } } },
          { partner: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const runs = await prisma.transactionRun.findMany({
    where: {
      ...(partnerId ? { partnerId } : {}),
      ...(endpointId ? { endpointId } : {}),
      ...(status ? { status } : {}),
      ...searchClause,
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
