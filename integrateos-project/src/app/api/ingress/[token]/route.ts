import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeEndpoint } from "@/lib/runtime/execute";

export const dynamic = "force-dynamic";

/**
 * POST /api/ingress/[token] — the runtime ingress endpoint.
 *
 * Accepts a raw payload as the request body (Content-Type agnostic),
 * looks up the Endpoint by its opaque token, runs the mapping's
 * transform, and either:
 *  - sync mode: returns the transformed output as the response body
 *  - forward mode: POSTs output to egressUrl and returns 202
 *
 * Every call creates a TransactionRun row visible in /runs.
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const endpoint = await prisma.endpoint.findUnique({ where: { token } });
  if (!endpoint || !endpoint.active) {
    return NextResponse.json({ error: "unknown or disabled endpoint" }, { status: 404 });
  }

  const payload = await request.text();
  if (!payload) {
    return NextResponse.json({ error: "empty request body" }, { status: 400 });
  }

  const result = await executeEndpoint(endpoint, payload);

  if (result.status === "failed") {
    return NextResponse.json(
      {
        ok: false,
        runId: result.runId,
        error: result.errorMessage,
      },
      { status: result.httpStatus },
    );
  }

  if (endpoint.mode === "forward") {
    return NextResponse.json(
      { ok: true, runId: result.runId },
      { status: result.httpStatus },
    );
  }

  // Sync: return the transformed payload directly. Content-Type reflects
  // the target format so downstream tooling can parse it.
  return new Response(result.output ?? "", {
    status: result.httpStatus,
    headers: {
      "Content-Type": contentTypeForRun(result.output),
      "X-Integrateos-Run-Id": result.runId,
    },
  });
}

/** Best-effort Content-Type sniffing for the sync response. */
function contentTypeForRun(output: string | null): string {
  if (!output) return "text/plain; charset=utf-8";
  const trimmed = output.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "application/json; charset=utf-8";
  }
  if (trimmed.startsWith("<")) return "application/xml; charset=utf-8";
  if (trimmed.startsWith("ISA")) return "application/edi-x12; charset=utf-8";
  if (trimmed.startsWith("UNA") || trimmed.startsWith("UNB")) {
    return "application/edifact; charset=utf-8";
  }
  return "text/plain; charset=utf-8";
}
