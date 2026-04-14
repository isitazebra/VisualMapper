import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { builtinSourceSchemaId, builtinTargetSchemaId } from "@/lib/schemas/registry";
import type { TargetFormat, TxType } from "@/lib/types";

/** GET /api/partners/[id]/mappings — list mapping specs for a partner. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const mappings = await prisma.mappingSpec.findMany({
    where: { partnerId: params.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(mappings);
}

/** POST /api/partners/[id]/mappings — create a new spec under a partner. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const txType = body.txType as string | undefined;
  const ediVersion = body.ediVersion as string | undefined;
  const targetFormat = body.targetFormat as string | undefined;
  if (!txType || !ediVersion || !targetFormat) {
    return NextResponse.json(
      { error: "txType, ediVersion, targetFormat are required" },
      { status: 400 },
    );
  }
  const partner = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!partner) return NextResponse.json({ error: "partner not found" }, { status: 404 });

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name
      : `${txType} ${ediVersion} → ${targetFormat}`;

  const spec = await prisma.mappingSpec.create({
    data: {
      partnerId: params.id,
      name,
      txType,
      ediVersion,
      sourceFormat: body.sourceFormat ?? "x12",
      targetFormat,
      direction: body.direction ?? "inbound",
      status: "draft",
      sourceSchemaId:
        body.sourceSchemaId ?? builtinSourceSchemaId(txType as TxType),
      targetSchemaId:
        body.targetSchemaId ??
        builtinTargetSchemaId(txType as TxType, targetFormat as TargetFormat),
    },
  });
  return NextResponse.json(spec, { status: 201 });
}
