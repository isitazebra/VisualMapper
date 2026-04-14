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
 * PATCH /api/mappings/[id] — upsert-all sync. The client sends its full
 * current `maps: FieldMap[]` and any metadata changes; we replace the
 * FieldMapping + CustomerOverride rows to match.
 *
 * This is intentionally coarse for the MVP — a single autosave round-trip
 * handles any combination of adds/edits/deletes. Volume is bounded (a
 * large 850 has ~50 base maps + ~20 overrides), so the cost is fine.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const maps: FieldMap[] = Array.isArray(body.maps) ? body.maps : [];

  const { baseRows, overrideRows } = splitMapsForDb(params.id, maps);

  const metadataUpdate: Record<string, string> = {};
  for (const key of ["name", "txType", "ediVersion", "targetFormat", "status"] as const) {
    if (typeof body[key] === "string") metadataUpdate[key] = body[key];
  }

  // One transaction: update spec metadata, wipe existing children, insert new ones.
  const updated = await prisma.$transaction(async (tx) => {
    const spec = await tx.mappingSpec.update({
      where: { id: params.id },
      data: metadataUpdate,
    });

    // Cascade-deletes the overrides too because of onDelete: Cascade on
    // CustomerOverride.fieldMappingId.
    await tx.fieldMapping.deleteMany({ where: { mappingSpecId: params.id } });

    if (baseRows.length > 0) {
      await tx.fieldMapping.createMany({ data: baseRows });
    }
    if (overrideRows.length > 0) {
      await tx.customerOverride.createMany({ data: overrideRows });
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
