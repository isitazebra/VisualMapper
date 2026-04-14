import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lookup tables — IntegrateOS",
};

export default async function LookupsIndexPage() {
  const dbError = await checkDb();
  if (dbError) return <DbSetupBanner error={dbError} />;

  const [rows, partners] = await Promise.all([
    prisma.lookupTable.findMany({
      orderBy: [{ partnerId: "asc" }, { name: "asc" }],
      include: { partner: { select: { name: true } } },
    }),
    prisma.partner.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>

        <div className="flex items-start justify-between mt-3 mb-1">
          <div>
            <h1 className="text-3xl font-bold">Lookup tables</h1>
            <p className="text-ink-soft">
              Key → value tables used by <code className="font-mono">lookup</code> rules.
              Scope a lookup to a single partner, or leave it global so every mapping
              can reference it.
            </p>
          </div>
          <Link
            href="/lookups/new"
            className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm whitespace-nowrap"
          >
            + New lookup
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded mt-6">
            No lookup tables yet. Create one to supply key→value translation to
            your mappings.
          </div>
        ) : (
          <ul className="space-y-2 mt-6">
            {rows.map((r) => {
              const entryCount =
                r.entries &&
                typeof r.entries === "object" &&
                !Array.isArray(r.entries)
                  ? Object.keys(r.entries as Record<string, unknown>).length
                  : 0;
              return (
                <li key={r.id}>
                  <Link
                    href={`/lookups/${r.id}`}
                    className="block border border-border rounded p-3 bg-paper hover:bg-paper-cream transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-ink">{r.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {r.partnerId ? (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-orange-soft text-brand-orange">
                            {r.partner?.name ?? "scoped"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
                            Global
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-paper-cream text-ink-soft">
                          {entryCount} entries
                        </span>
                      </div>
                    </div>
                    {r.description && (
                      <div className="text-xs text-ink-soft mt-1 line-clamp-2">
                        {r.description}
                      </div>
                    )}
                    <div className="text-[10px] text-ink-mute mt-1">
                      Updated {r.updatedAt.toLocaleString()}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {partners.length === 0 && (
          <p className="text-xs text-ink-mute mt-6">
            Tip: create partners first if you want partner-scoped lookups.
          </p>
        )}
      </div>
    </main>
  );
}
