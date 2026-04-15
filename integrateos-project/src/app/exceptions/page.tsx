import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { ExceptionQueueClient } from "@/components/workspace/ExceptionQueueClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exception queue — IntegrateOS" };

export default async function ExceptionsPage() {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const rows = await prisma.transactionRun.findMany({
    where: { status: "failed", resolved: false },
    orderBy: { receivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      receivedAt: true,
      errorStage: true,
      errorMessage: true,
      inputSize: true,
      partner: { select: { id: true, name: true } },
      endpoint: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <div className="flex items-start justify-between mt-3 mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Exception queue</h1>
            <p className="text-ink-soft">
              Unresolved failed transactions. Select any combination and replay
              against the current mapping, or mark resolved with a note.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Link
              href="/runs?status=failed"
              className="px-2 py-1 rounded border border-border bg-paper text-ink-soft hover:bg-paper-cream text-xs font-semibold"
            >
              All failed (incl. resolved) →
            </Link>
          </div>
        </div>

        <ExceptionQueueClient rows={rows} />
      </div>
    </main>
  );
}
