import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/lookups — list all lookup tables.
 *
 * Query params:
 *  - partnerId — include lookups scoped to that partner plus any globals.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("partnerId");

  const rows = await prisma.lookupTable.findMany({
    where: partnerId
      ? { OR: [{ partnerId: null }, { partnerId }] }
      : undefined,
    orderBy: [{ partnerId: "asc" }, { name: "asc" }],
  });

  const summaries = rows.map((r) => ({
    id: r.id,
    partnerId: r.partnerId,
    name: r.name,
    description: r.description,
    entryCount:
      r.entries && typeof r.entries === "object" && !Array.isArray(r.entries)
        ? Object.keys(r.entries as Record<string, unknown>).length
        : 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  return NextResponse.json(summaries);
}

/** POST /api/lookups — create a new lookup.
 *
 * Body: { name, description?, partnerId?, entries: { [k]: v } } */
export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (
    !body?.entries ||
    typeof body.entries !== "object" ||
    Array.isArray(body.entries)
  ) {
    return NextResponse.json(
      { error: "entries must be an object of keys → values" },
      { status: 400 },
    );
  }

  const row = await prisma.lookupTable.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      partnerId: body.partnerId ?? null,
      entries: body.entries,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
