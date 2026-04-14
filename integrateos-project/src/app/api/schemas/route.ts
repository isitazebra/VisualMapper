import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { BUILTIN_SCHEMAS, type SchemaFormat } from "@/lib/schemas/registry";
import type { SchemaNode } from "@/lib/types";

/**
 * GET /api/schemas — list all schemas (built-ins from code + custom rows
 * from Postgres) in a unified shape the NewMappingForm consumes.
 *
 * Query params:
 *  - role=source|target — filter by role
 *  - partnerId=<id>     — include custom schemas scoped to that partner
 *                         plus any global customs
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  const partnerId = url.searchParams.get("partnerId");

  const custom = await prisma.schema.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(partnerId ? { OR: [{ partnerId: null }, { partnerId }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const builtins = (role
    ? BUILTIN_SCHEMAS.filter((s) => s.role === role || s.role === "both")
    : BUILTIN_SCHEMAS
  ).map((s) => ({
    id: s.id,
    kind: "builtin" as const,
    role: s.role,
    format: s.format,
    displayName: s.displayName,
    description: s.description ?? null,
    leafCount: s.nodes.filter((n) => n.type === "el").length,
  }));

  const customs = custom.map((row) => ({
    id: row.id,
    kind: "custom" as const,
    role: row.role,
    format: row.format,
    displayName: row.displayName,
    description: row.description,
    leafCount: Array.isArray(row.nodes)
      ? (row.nodes as unknown as SchemaNode[]).filter((n) => n.type === "el").length
      : 0,
    partnerId: row.partnerId,
    createdAt: row.createdAt,
  }));

  return NextResponse.json({ builtins, customs });
}

/**
 * POST /api/schemas — save a custom schema (from an inferred tree).
 *
 * Body: {
 *   role: "source" | "target",
 *   format: SchemaFormat,
 *   displayName: string,
 *   description?: string,
 *   partnerId?: string,
 *   nodes: SchemaNode[]
 * }
 */
export async function POST(request: Request) {
  const body = await request.json();

  if (!["source", "target"].includes(body?.role)) {
    return NextResponse.json({ error: "role must be source or target" }, { status: 400 });
  }
  if (!body?.format || typeof body.format !== "string") {
    return NextResponse.json({ error: "format is required" }, { status: 400 });
  }
  if (!body?.displayName || typeof body.displayName !== "string") {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }
  if (!Array.isArray(body?.nodes) || body.nodes.length === 0) {
    return NextResponse.json({ error: "nodes must be a non-empty array" }, { status: 400 });
  }

  const id = `custom:${randomUUID()}`;
  const created = await prisma.schema.create({
    data: {
      id,
      role: body.role,
      format: body.format as SchemaFormat,
      displayName: body.displayName,
      description: body.description ?? null,
      nodes: body.nodes,
      partnerId: body.partnerId ?? null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
