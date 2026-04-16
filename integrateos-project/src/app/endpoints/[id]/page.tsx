import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { EndpointDetailClient } from "@/components/workspace/EndpointDetailClient";

export const dynamic = "force-dynamic";

export default async function EndpointDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const endpoint = await prisma.endpoint.findUnique({
    where: { id: params.id },
    include: {
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true, txType: true, targetFormat: true, samplePayload: true } },
    },
  });
  if (!endpoint) notFound();

  const recentRuns = await prisma.transactionRun.findMany({
    where: { endpointId: endpoint.id },
    orderBy: { receivedAt: "desc" },
    take: 25,
    select: {
      id: true,
      status: true,
      receivedAt: true,
      durationMs: true,
      inputSize: true,
      outputSize: true,
      errorMessage: true,
      egressStatus: true,
    },
  });

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/endpoints" className="text-xs text-ink-mute hover:underline">
          ← Endpoints
        </Link>
        <div className="flex items-center gap-3 mt-3 mb-1">
          <h1 className="text-3xl font-bold">{endpoint.name}</h1>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              endpoint.active
                ? "bg-brand-green-soft text-brand-green"
                : "bg-paper-cream text-ink-mute"
            }`}
          >
            {endpoint.active ? "active" : "paused"}
          </span>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
            {endpoint.mode}
          </span>
        </div>
        <div className="text-sm text-ink-mute mb-6">
          <Link href={`/workspace/${endpoint.partner.id}`} className="underline">
            {endpoint.partner.name}
          </Link>
          {" → "}
          <Link
            href={`/workspace/${endpoint.partner.id}/mapping/${endpoint.mappingSpec.id}`}
            className="underline"
          >
            {endpoint.mappingSpec.name}
          </Link>
        </div>

        <EndpointDetailClient endpoint={endpoint} />

        <section className="mt-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Recent runs</h2>
            <Link
              href={`/runs?endpointId=${endpoint.id}`}
              className="text-xs text-brand-blue underline"
            >
              View all →
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
              No runs yet. Send a POST to this endpoint to see your first transaction.
            </div>
          ) : (
            <ul className="space-y-1">
              {recentRuns.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/runs/${r.id}`}
                    className="block border border-border rounded p-2 bg-paper hover:bg-paper-cream transition text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold uppercase px-1.5 py-0.5 rounded text-[10px] ${
                          r.status === "delivered"
                            ? "bg-brand-green-soft text-brand-green"
                            : r.status === "failed"
                              ? "bg-brand-red/10 text-brand-red"
                              : "bg-brand-amber-soft text-brand-amber"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="font-mono text-ink-mute">
                        {r.receivedAt.toLocaleString()}
                      </span>
                      <span className="font-mono text-ink-mute">
                        {r.inputSize}B in
                      </span>
                      {r.outputSize !== null && (
                        <span className="font-mono text-ink-mute">{r.outputSize}B out</span>
                      )}
                      {r.durationMs !== null && (
                        <span className="font-mono text-ink-mute">{r.durationMs}ms</span>
                      )}
                      {r.errorMessage && (
                        <span className="text-brand-red truncate">{r.errorMessage}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
