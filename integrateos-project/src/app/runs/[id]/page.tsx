import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { ReplayButton } from "@/components/workspace/ReplayButton";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const run = await prisma.transactionRun.findUnique({
    where: { id: params.id },
    include: {
      endpoint: { select: { id: true, name: true, mode: true, egressUrl: true } },
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true } },
    },
  });
  if (!run) notFound();

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/runs" className="text-xs text-ink-mute hover:underline">
          ← Transaction stream
        </Link>

        <div className="flex items-center gap-3 mt-3 mb-1 flex-wrap">
          <h1 className="text-3xl font-bold font-mono">{run.id.slice(0, 12)}…</h1>
          <StatusPill status={run.status} />
        </div>
        <div className="text-sm text-ink-mute mb-6 font-mono">
          {run.receivedAt.toLocaleString()} · {run.durationMs ?? "—"}ms ·{" "}
          <Link href={`/endpoints/${run.endpoint.id}`} className="underline">
            {run.endpoint.name}
          </Link>
          {" · "}
          <Link
            href={`/workspace/${run.partner.id}/mapping/${run.mappingSpec.id}`}
            className="underline"
          >
            {run.mappingSpec.name}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-xs">
          <Stat label="Input size" value={`${run.inputSize} B`} />
          <Stat
            label="Output size"
            value={run.outputSize !== null ? `${run.outputSize} B` : "—"}
          />
          <Stat
            label="Fields"
            value={
              run.mappedCount !== null
                ? `${run.mappedCount} mapped / ${run.unmappedCount ?? 0} skipped`
                : "—"
            }
          />
          <Stat
            label="Mode"
            value={
              run.endpoint.mode === "forward"
                ? `Forward · HTTP ${run.egressStatus ?? "—"}`
                : "Sync"
            }
          />
        </div>

        {run.errorMessage && (
          <section className="mb-6 border border-brand-red/40 bg-brand-red/5 rounded p-3">
            <div className="text-xs font-bold uppercase text-brand-red mb-1">
              {run.errorStage ?? "error"}
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {run.errorMessage}
            </pre>
          </section>
        )}

        <PayloadSection title="Input" body={run.inputPayload} />
        {run.outputPayload && (
          <PayloadSection title="Output" body={run.outputPayload} />
        )}
        {run.egressBody && (
          <PayloadSection title="Egress response" body={run.egressBody} />
        )}

        <div className="mt-8">
          <ReplayButton runId={run.id} />
        </div>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "delivered"
      ? "bg-brand-green-soft text-brand-green"
      : status === "failed"
        ? "bg-brand-red/10 text-brand-red"
        : "bg-brand-amber-soft text-brand-amber";
  return (
    <span
      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${tone}`}
    >
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded p-2 bg-paper">
      <div className="text-[9px] font-bold uppercase text-ink-soft">{label}</div>
      <div className="font-mono mt-0.5 truncate">{value}</div>
    </div>
  );
}

function PayloadSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="mb-4 border border-border rounded bg-paper overflow-hidden">
      <div className="px-3 py-1.5 bg-paper-cream border-b border-border text-xs font-bold">
        {title}
      </div>
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all max-h-[20rem] overflow-y-auto">
        {body}
      </pre>
    </section>
  );
}
