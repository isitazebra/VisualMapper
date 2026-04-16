import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";

export const dynamic = "force-dynamic";

export const metadata = { title: "Endpoints — IntegrateOS" };

export default async function EndpointsIndexPage() {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const endpoints = await prisma.endpoint.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: { id: true, name: true } },
      mappingSpec: { select: { id: true, name: true, txType: true, targetFormat: true } },
      _count: { select: { runs: true } },
    },
  });

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <div className="flex items-start justify-between mt-3 mb-1">
          <div>
            <h1 className="text-3xl font-bold">Ingress endpoints</h1>
            <p className="text-ink-soft">
              Each endpoint binds a URL token to a mapping spec. POST a payload and
              the runtime transforms it — returning the result synchronously or
              forwarding to your egress URL.
            </p>
          </div>
          <Link
            href="/endpoints/new"
            className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm whitespace-nowrap"
          >
            + New endpoint
          </Link>
        </div>

        {endpoints.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded mt-6">
            No endpoints yet. Create one to start receiving inbound traffic.
          </div>
        ) : (
          <ul className="space-y-2 mt-6">
            {endpoints.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/endpoints/${e.id}`}
                  className="block border border-border rounded p-3 bg-paper hover:bg-paper-cream transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{e.name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          e.active
                            ? "bg-brand-green-soft text-brand-green"
                            : "bg-paper-cream text-ink-mute"
                        }`}
                      >
                        {e.active ? "active" : "paused"}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
                        {e.mode}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-ink-mute font-mono mt-1">
                    {e.partner.name} → {e.mappingSpec.name}
                  </div>
                  <div className="text-[10px] text-ink-mute mt-1 font-mono truncate">
                    /api/ingress/{e.token}
                  </div>
                  <div className="text-[10px] text-ink-mute mt-1">
                    {e._count.runs} run{e._count.runs === 1 ? "" : "s"} ·{" "}
                    created {e.createdAt.toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] text-ink-mute mt-8">
          <Link href="/runs" className="underline">
            View transaction stream →
          </Link>
        </p>
      </div>
    </main>
  );
}
