import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { NewPartnerForm } from "@/components/workspace/NewPartnerForm";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const error = await checkDb();
  if (error) return <DbSetupBanner error={error} />;

  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { mappings: true } } },
  });

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-brand-blue rotate-45" />
          <span className="text-2xl font-extrabold">IntegrateOS</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Trading partners</h1>
        <p className="text-ink-soft mb-8">
          Each partner has its own workspace with mapping specs, activity log, and
          onboarding status.
        </p>

        <div className="grid md:grid-cols-3 gap-3 mb-10">
          {partners.map((p) => (
            <Link
              key={p.id}
              href={`/workspace/${p.id}`}
              className="block border border-border rounded p-4 bg-paper hover:bg-paper-cream transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-ink">{p.name}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    p.status === "active"
                      ? "bg-brand-green-soft text-brand-green"
                      : p.status === "onboarding"
                        ? "bg-brand-amber-soft text-brand-amber"
                        : "bg-paper-cream text-ink-mute"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-xs text-ink-mute font-mono">
                {p.scac ?? "—"} · {p.type}
              </div>
              <div className="text-xs text-ink-soft mt-2">
                {p._count.mappings} mapping{p._count.mappings === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
          {partners.length === 0 && (
            <div className="md:col-span-3 text-sm text-ink-mute p-4 border border-dashed border-border rounded">
              No partners yet. Add one below or run{" "}
              <code className="font-mono">npm run db:seed</code> locally to load examples.
            </div>
          )}
        </div>

        <section className="border border-border rounded p-5 bg-paper max-w-xl">
          <h2 className="text-lg font-bold mb-3">New partner</h2>
          <NewPartnerForm />
        </section>

        <p className="mt-10 text-xs text-ink-mute flex gap-4">
          <Link href="/schemas" className="underline">
            Browse schemas →
          </Link>
          <Link href="/mapper" className="underline">
            Open mapper without persistence →
          </Link>
        </p>
      </div>
    </main>
  );
}
