import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/lookups/[id] — single lookup with its full entries map. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await prisma.lookupTable.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

/** PATCH /api/lookups/[id] — partial update (name / description / entries). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (body.description !== undefined)
    data.description = typeof body.description === "string" ? body.description : null;
  if (body.entries !== undefined) {
    if (
      !body.entries ||
      typeof body.entries !== "object" ||
      Array.isArray(body.entries)
    ) {
      return NextResponse.json(
        { error: "entries must be an object" },
        { status: 400 },
      );
    }
    data.entries = body.entries;
  }
  const row = await prisma.lookupTable.update({ where: { id: params.id }, data });
  return NextResponse.json(row);
}

/** DELETE /api/lookups/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.lookupTable.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
