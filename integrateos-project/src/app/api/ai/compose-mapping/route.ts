import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flattenDbSpec } from "@/lib/mappingSpec";
import { resolveSchemas } from "@/lib/schemas/resolver";
import { CUSTOMERS } from "@/lib/schemas";
import { proposeMappings } from "@/lib/ai/compose";
import type { FieldMap } from "@/lib/types";

/**
 * POST /api/ai/compose-mapping
 *
 * Body: { mappingId: string, prompt: string, maps?: FieldMap[] }
 *
 * `maps` is optional — if the client sends its current in-memory maps
 * (including unsaved edits), we use those as context instead of
 * re-reading from Postgres. This keeps the LLM's view in sync with
 * what the user actually sees in the studio.
 *
 * Returns ComposeResponse | ComposeError.
 */
export async function POST(request: Request) {
  let body: { mappingId?: string; prompt?: string; maps?: FieldMap[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const mappingId = body.mappingId;
  const prompt = body.prompt?.trim();
  if (!mappingId || typeof mappingId !== "string") {
    return NextResponse.json(
      { ok: false, error: "mappingId is required" },
      { status: 400 },
    );
  }
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "prompt must be a non-empty string" },
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

  // Prefer the client's in-memory maps if provided — they reflect any
  // edits made since the last autosave.
  const existingMaps = Array.isArray(body.maps) ? body.maps : hydrated.maps;

  try {
    const result = await proposeMappings({
      userPrompt: prompt,
      sourceDescriptor,
      targetDescriptor,
      existingMaps,
      customers: CUSTOMERS,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /ANTHROPIC_API_KEY/.test(message) ? 503 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
