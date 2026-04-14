import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flattenDbSpec, splitMapsForDb } from "@/lib/mappingSpec";
import type { FieldMap } from "@/lib/types";

/** GET /api/mappings/[id] — full hydrated spec (metadata + field mappings + overrides). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const spec = await prisma.mappingSpec.findUnique({
    where: { id: params.id },
    include: {
      fieldMappings: {
        include: { overrides: true },
      },
    },
  });
  if (!spec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(flattenDbSpec(spec));
}

/**
 * PATCH /api/mappings/[id] — partial update. Accepts any subset of:
 *   { maps, name, txType, ediVersion, targetFormat, status, samplePayload }
 *
 * When `maps` is included the FieldMapping + CustomerOverride rows are
 * wiped and re-inserted inside a transaction. When `maps` is NOT
 * included we only update the scalar columns — important so the sample
 * payload can be saved without touching the field mappings.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const hasMapsUpdate = Array.isArray(body.maps);
  const maps: FieldMap[] = hasMapsUpdate ? (body.maps as FieldMap[]) : [];

  const metadataUpdate: Record<string, string | null> = {};
  for (const key of ["name", "txType", "ediVersion", "targetFormat", "status"] as const) {
    if (typeof body[key] === "string") metadataUpdate[key] = body[key];
  }
  if (body.samplePayload !== undefined) {
    metadataUpdate.samplePayload =
      typeof body.samplePayload === "string" ? body.samplePayload : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const spec = await tx.mappingSpec.update({
      where: { id: params.id },
      data: metadataUpdate,
    });

    if (hasMapsUpdate) {
      // Cascade-deletes the overrides via the onDelete: Cascade FK.
      await tx.fieldMapping.deleteMany({ where: { mappingSpecId: params.id } });
      const { baseRows, overrideRows } = splitMapsForDb(params.id, maps);
      if (baseRows.length > 0) {
        await tx.fieldMapping.createMany({ data: baseRows });
      }
      if (overrideRows.length > 0) {
        await tx.customerOverride.createMany({ data: overrideRows });
      }
    }

    return tx.mappingSpec.findUnique({
      where: { id: spec.id },
      include: { fieldMappings: { include: { overrides: true } } },
    });
  });

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(flattenDbSpec(updated));
}

/** DELETE /api/mappings/[id] — remove a mapping spec. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.mappingSpec.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
