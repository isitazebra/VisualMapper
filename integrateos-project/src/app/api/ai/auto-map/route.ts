import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flattenDbSpec } from "@/lib/mappingSpec";
import { resolveSchemas } from "@/lib/schemas/resolver";
import { bulkAutoMap } from "@/lib/ai/autoMap";
import type { FieldMap } from "@/lib/types";

/**
 * POST /api/ai/auto-map
 *
 * Body: { mappingId: string, maps?: FieldMap[] }
 *
 * Skips targets that are already mapped (per the provided `maps` or the
 * persisted ones). Returns a batch of AiProposedOperation rows with
 * per-op confidence + reasoning for the client to preview.
 */
export async function POST(request: Request) {
  let body: { mappingId?: string; maps?: FieldMap[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const mappingId = body.mappingId;
  if (!mappingId || typeof mappingId !== "string") {
    return NextResponse.json(
      { ok: false, error: "mappingId is required" },
      { status: 400 },
    );
  }

  const spec = await prisma.mappingSpec.findUnique({
    where: { id: mappingId },
    include: { fieldMappings: { include: { overrides: true } } },
  });
  if (!spec) {
    return NextResponse.json({ ok: false, error: "Mapping not found" }, { status: 404 });
  }

  const hydrated = flattenDbSpec(spec);
  const [sourceDescriptor, targetDescriptor] = await resolveSchemas(prisma, [
    hydrated.sourceSchemaId,
    hydrated.targetSchemaId,
  ]);
  if (!sourceDescriptor || !targetDescriptor) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve source or target schema" },
      { status: 422 },
    );
  }

  const existingMaps = Array.isArray(body.maps) ? body.maps : hydrated.maps;

  try {
    const result = await bulkAutoMap({
      sourceDescriptor,
      targetDescriptor,
      existingMaps,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /ANTHROPIC_API_KEY/.test(message) ? 503 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
