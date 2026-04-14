import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/partners/[id] — single partner with all its mapping specs. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      mappings: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!partner) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(partner);
}

/** PATCH /api/partners/[id] — update partner metadata. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const partner = await prisma.partner.update({
    where: { id: params.id },
    data: {
      name: body.name,
      scac: body.scac,
      type: body.type,
      status: body.status,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
    },
  });
  return NextResponse.json(partner);
}
