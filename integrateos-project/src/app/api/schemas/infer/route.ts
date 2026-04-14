import { NextResponse } from "next/server";
import { inferSchemaFromSample } from "@/lib/infer";
import type { SchemaFormat } from "@/lib/schemas/registry";

const SUPPORTED_FORMATS: readonly SchemaFormat[] = ["json", "xml", "otm_xml", "csv", "x12"];

/**
 * POST /api/schemas/infer — sample → SchemaNode[] preview.
 *
 * Body: { format: SchemaFormat, sample: string }
 * Response: { nodes: SchemaNode[] } on success, { error: string } on failure.
 *
 * Does not persist anything; call POST /api/schemas separately to save.
 */
export async function POST(request: Request) {
  let body: { format?: string; sample?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const format = body.format;
  const sample = body.sample;

  if (!format || !SUPPORTED_FORMATS.includes(format as SchemaFormat)) {
    return NextResponse.json(
      { error: `format must be one of: ${SUPPORTED_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof sample !== "string" || sample.trim().length === 0) {
    return NextResponse.json({ error: "sample must be a non-empty string" }, { status: 400 });
  }

  try {
    const nodes = inferSchemaFromSample(format as SchemaFormat, sample);
    return NextResponse.json({ nodes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }
}
