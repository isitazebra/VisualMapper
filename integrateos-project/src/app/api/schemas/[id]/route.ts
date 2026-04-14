import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSchemaById } from "@/lib/schemas/registry";

/** GET /api/schemas/[id] — descriptor + full node list. Handles both kinds. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const builtin = getSchemaById(id);
  if (builtin) return NextResponse.json(builtin);

  if (!id.startsWith("custom:")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const row = await prisma.schema.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

/** DELETE /api/schemas/[id] — only custom schemas can be deleted. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  if (!id.startsWith("custom:")) {
    return NextResponse.json(
      { error: "Built-in schemas cannot be deleted" },
      { status: 403 },
    );
  }
  await prisma.schema.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
