import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeEndpoint } from "@/lib/runtime/execute";

/** GET /api/runs/[id] — full run detail including input/output payload. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const run = await prisma.transactionRun.findUnique({
    where: { id: params.id },
    include: {
      endpoint: { select: { id: true, name: true, mode: true, egressUrl: true } },
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true } },
    },
  });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(run);
}

/** POST /api/runs/[id]/replay — re-run the stored input payload
 * against the endpoint's *current* mapping. Produces a new
 * TransactionRun row; the original is untouched so you can compare. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const original = await prisma.transactionRun.findUnique({ where: { id: params.id } });
  if (!original) return NextResponse.json({ error: "not found" }, { status: 404 });

  const endpoint = await prisma.endpoint.findUnique({
    where: { id: original.endpointId },
  });
  if (!endpoint) {
    return NextResponse.json(
      { error: "endpoint no longer exists" },
      { status: 404 },
    );
  }
  const result = await executeEndpoint(endpoint, original.inputPayload);
  return NextResponse.json(result);
}
