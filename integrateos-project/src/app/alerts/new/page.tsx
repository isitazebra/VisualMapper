import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { NewAlertForm } from "@/components/workspace/NewAlertForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "New alert rule — IntegrateOS" };

export default async function NewAlertPage() {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const [partners, endpoints] = await Promise.all([
    prisma.partner.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.endpoint.findMany({
      select: { id: true, name: true, partnerId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <Link href="/alerts" className="text-xs text-ink-mute hover:underline">
          ← Alerts
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">New alert rule</h1>
        <p className="text-ink-soft mb-6">
          Pick a scope, a condition, and a webhook to call when the threshold is
          breached over the rolling window.
        </p>
        <NewAlertForm partners={partners} endpoints={endpoints} />
      </div>
    </main>
  );
}
