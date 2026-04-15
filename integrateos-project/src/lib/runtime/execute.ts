/**
 * Runtime orchestrator. Given an Endpoint + an inbound payload, runs
 * the mapping spec's transform against the current schemas + lookup
 * tables, persists a TransactionRun row capturing the full lifecycle,
 * and (when mode=forward) POSTs the output to the egress URL.
 *
 * Called by the /api/ingress/[token] route. Self-contained — does not
 * depend on any Next.js request/response types so it can be reused
 * from other ingress surfaces later (scheduled jobs, SFTP poll, etc.).
 */
import type { Endpoint, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { flattenDbSpec } from "@/lib/mappingSpec";
import { resolveSchemas } from "@/lib/schemas/resolver";
import { runTransform } from "@/lib/transform";

type Tx = PrismaClient | Prisma.TransactionClient;

export interface ExecuteResult {
  runId: string;
  status: string;
  output: string | null;
  httpStatus: number;
  errorMessage?: string;
}

/** Execute an inbound payload against an endpoint and persist the run. */
export async function executeEndpoint(
  endpoint: Endpoint,
  inputPayload: string,
): Promise<ExecuteResult> {
  const startedAt = Date.now();

  // Always create the run row first so partial failures are still
  // visible in the UI.
  const initial = await prisma.transactionRun.create({
    data: {
      endpointId: endpoint.id,
      partnerId: endpoint.partnerId,
      mappingSpecId: endpoint.mappingSpecId,
      status: "received",
      inputPayload,
      inputSize: Buffer.byteLength(inputPayload, "utf8"),
    },
  });

  try {
    // Load the mapping + schemas + lookups.
    const spec = await prisma.mappingSpec.findUnique({
      where: { id: endpoint.mappingSpecId },
      include: { fieldMappings: { include: { overrides: true } } },
    });
    if (!spec) {
      return await markFailed(
        prisma,
        initial.id,
        "transform",
        "Mapping spec not found",
        startedAt,
      );
    }
    const hydrated = flattenDbSpec(spec);
    const [source, target] = await resolveSchemas(prisma, [
      hydrated.sourceSchemaId,
      hydrated.targetSchemaId,
    ]);
    if (!source || !target) {
      return await markFailed(
        prisma,
        initial.id,
        "transform",
        "Could not resolve source or target schema",
        startedAt,
      );
    }

    const lookupRows = await prisma.lookupTable.findMany({
      where: { OR: [{ partnerId: null }, { partnerId: endpoint.partnerId }] },
    });
    const lookupTables = new Map<string, Record<string, string>>();
    for (const row of lookupRows) {
      if (
        row.entries &&
        typeof row.entries === "object" &&
        !Array.isArray(row.entries)
      ) {
        lookupTables.set(row.name, row.entries as Record<string, string>);
      }
    }

    // Run the transform (same engine the studio preview uses).
    const result = runTransform({
      source,
      target,
      maps: hydrated.maps,
      sample: inputPayload,
      activeCustomer: "(Base)",
      lookupTables,
    });

    if (!result.ok) {
      return await markFailed(
        prisma,
        initial.id,
        "transform",
        result.error,
        startedAt,
      );
    }

    const transformedAt = new Date();
    await prisma.transactionRun.update({
      where: { id: initial.id },
      data: {
        status: "transformed",
        outputPayload: result.output,
        outputSize: Buffer.byteLength(result.output, "utf8"),
        mappedCount: result.mappedCount,
        unmappedCount: result.unmappedLeafCount,
        transactionCount: result.transactionCount ?? null,
        transformedAt,
      },
    });

    // Egress: if mode === "forward", POST to egressUrl.
    if (endpoint.mode === "forward" && endpoint.egressUrl) {
      const egress = await dispatchEgress(endpoint, result.output);
      const durationMs = Date.now() - startedAt;
      await prisma.transactionRun.update({
        where: { id: initial.id },
        data: {
          status: egress.ok ? "delivered" : "failed",
          errorStage: egress.ok ? null : "egress",
          errorMessage: egress.ok ? null : egress.error ?? null,
          egressStatus: egress.httpStatus ?? null,
          egressBody: egress.body ?? null,
          egressError: egress.ok ? null : egress.error ?? null,
          deliveredAt: egress.ok ? new Date() : null,
          durationMs,
        },
      });
      return {
        runId: initial.id,
        status: egress.ok ? "delivered" : "failed",
        output: result.output,
        httpStatus: egress.ok ? 202 : 502,
        errorMessage: egress.ok ? undefined : egress.error,
      };
    }

    // Sync mode — return output body to caller.
    await prisma.transactionRun.update({
      where: { id: initial.id },
      data: {
        status: "delivered",
        deliveredAt: new Date(),
        durationMs: Date.now() - startedAt,
      },
    });
    return {
      runId: initial.id,
      status: "delivered",
      output: result.output,
      httpStatus: 200,
    };
  } catch (err) {
    return await markFailed(
      prisma,
      initial.id,
      "transform",
      err instanceof Error ? err.message : String(err),
      startedAt,
    );
  }
}

async function markFailed(
  db: Tx,
  runId: string,
  stage: string,
  message: string,
  startedAt: number,
): Promise<ExecuteResult> {
  await db.transactionRun.update({
    where: { id: runId },
    data: {
      status: "failed",
      errorStage: stage,
      errorMessage: message,
      durationMs: Date.now() - startedAt,
    },
  });
  return {
    runId,
    status: "failed",
    output: null,
    httpStatus: stage === "parse" ? 400 : 422,
    errorMessage: message,
  };
}

interface EgressResult {
  ok: boolean;
  httpStatus?: number;
  body?: string;
  error?: string;
}

async function dispatchEgress(endpoint: Endpoint, output: string): Promise<EgressResult> {
  if (!endpoint.egressUrl) {
    return { ok: false, error: "Egress URL not configured" };
  }
  const headers: Record<string, string> = { "Content-Type": "application/octet-stream" };
  if (
    endpoint.egressHeaders &&
    typeof endpoint.egressHeaders === "object" &&
    !Array.isArray(endpoint.egressHeaders)
  ) {
    for (const [k, v] of Object.entries(endpoint.egressHeaders as Record<string, unknown>)) {
      if (typeof v === "string") headers[k] = v;
    }
  }
  try {
    const res = await fetch(endpoint.egressUrl, {
      method: "POST",
      headers,
      body: output,
    });
    const body = await res.text().catch(() => "");
    return {
      ok: res.ok,
      httpStatus: res.status,
      body: body.slice(0, 4096),
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
