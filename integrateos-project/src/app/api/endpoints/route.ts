import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/** GET /api/endpoints — list all endpoints (optionally filter by partner). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("partnerId");
  const endpoints = await prisma.endpoint.findMany({
    where: partnerId ? { partnerId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true, txType: true, targetFormat: true } },
      _count: { select: { runs: true } },
    },
  });
  return NextResponse.json(endpoints);
}

/** POST /api/endpoints — create a new endpoint. */
export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.partnerId || !body?.mappingSpecId || !body?.name) {
    return NextResponse.json(
      { error: "partnerId, mappingSpecId, and name are required" },
      { status: 400 },
    );
  }
  if (body.mode && !["sync", "forward"].includes(body.mode)) {
    return NextResponse.json(
      { error: "mode must be 'sync' or 'forward'" },
      { status: 400 },
    );
  }
  if (body.mode === "forward" && !body.egressUrl) {
    return NextResponse.json(
      { error: "egressUrl is required for forward mode" },
      { status: 400 },
    );
  }

  const token = body.token ?? randomBytes(18).toString("base64url");
  const endpoint = await prisma.endpoint.create({
    data: {
      partnerId: body.partnerId,
      mappingSpecId: body.mappingSpecId,
      name: body.name,
      token,
      mode: body.mode ?? "sync",
      egressUrl: body.egressUrl ?? null,
      egressHeaders: body.egressHeaders ?? null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(endpoint, { status: 201 });
}
