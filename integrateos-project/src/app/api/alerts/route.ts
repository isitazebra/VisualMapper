import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_CONDITIONS = ["error_rate_over", "failure_count", "volume_drop"];

/** GET /api/alerts — list rules with their most recent fire. */
export async function GET() {
  const rules = await prisma.alertRule.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: true } },
      events: { orderBy: { triggeredAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(rules);
}

/** POST /api/alerts — create. */
export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!VALID_CONDITIONS.includes(body?.condition)) {
    return NextResponse.json(
      { error: `condition must be one of: ${VALID_CONDITIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof body?.threshold !== "number" || body.threshold < 0) {
    return NextResponse.json({ error: "threshold must be a non-negative number" }, { status: 400 });
  }
  if (typeof body?.windowMin !== "number" || body.windowMin <= 0) {
    return NextResponse.json({ error: "windowMin must be > 0" }, { status: 400 });
  }
  if (body.channel !== "webhook") {
    return NextResponse.json({ error: "only channel='webhook' is supported" }, { status: 400 });
  }
  if (!body.webhookUrl) {
    return NextResponse.json({ error: "webhookUrl is required" }, { status: 400 });
  }

  const rule = await prisma.alertRule.create({
    data: {
      name: body.name,
      partnerId: body.partnerId ?? null,
      endpointId: body.endpointId ?? null,
      condition: body.condition,
      threshold: body.threshold,
      windowMin: body.windowMin,
      channel: "webhook",
      webhookUrl: body.webhookUrl,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
