import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: params.id },
    include: {
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true } },
    },
  });
  if (!endpoint) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(endpoint);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.mode === "string") {
    if (!["sync", "forward"].includes(body.mode)) {
      return NextResponse.json({ error: "invalid mode" }, { status: 400 });
    }
    data.mode = body.mode;
  }
  if (body.egressUrl !== undefined) data.egressUrl = body.egressUrl || null;
  if (body.egressHeaders !== undefined) data.egressHeaders = body.egressHeaders ?? null;
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.rotateToken === true) {
    data.token = randomBytes(18).toString("base64url");
  }
  const endpoint = await prisma.endpoint.update({ where: { id: params.id }, data });
  return NextResponse.json(endpoint);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.endpoint.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
