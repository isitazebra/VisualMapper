import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/partners — list all partners with mapping count. */
export async function GET() {
  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { mappings: true } },
    },
  });
  return NextResponse.json(partners);
}

/** POST /api/partners — create a new partner. */
export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const partner = await prisma.partner.create({
    data: {
      name: body.name,
      scac: body.scac ?? null,
      type: body.type ?? "customer",
      status: body.status ?? "onboarding",
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
    },
  });
  return NextResponse.json(partner, { status: 201 });
}
