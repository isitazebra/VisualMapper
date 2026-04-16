import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const rule = await prisma.alertRule.findUnique({
    where: { id: params.id },
    include: {
      events: { orderBy: { triggeredAt: "desc" }, take: 50 },
    },
  });
  if (!rule) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rule);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.threshold === "number" && body.threshold >= 0) data.threshold = body.threshold;
  if (typeof body.windowMin === "number" && body.windowMin > 0) data.windowMin = body.windowMin;
  if (typeof body.webhookUrl === "string") data.webhookUrl = body.webhookUrl;
  if (typeof body.active === "boolean") data.active = body.active;
  const rule = await prisma.alertRule.update({ where: { id: params.id }, data });
  return NextResponse.json(rule);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.alertRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
