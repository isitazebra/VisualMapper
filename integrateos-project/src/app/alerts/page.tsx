import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";

export const dynamic = "force-dynamic";

export const metadata = { title: "Alerts — IntegrateOS" };

const CONDITION_LABEL: Record<string, string> = {
  error_rate_over: "Error rate ≥",
  failure_count: "Failures ≥",
  volume_drop: "Volume <",
};

export default async function AlertsIndexPage() {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const [rules, recentEvents] = await Promise.all([
    prisma.alertRule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        partner: { select: { id: true, name: true } },
        endpoint: { select: { id: true, name: true } },
        _count: { select: { events: true } },
      },
    }),
    prisma.alertEvent.findMany({
      orderBy: { triggeredAt: "desc" },
      take: 25,
      include: { rule: { select: { name: true, id: true } } },
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <div className="flex items-start justify-between mt-3 mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Alerts</h1>
            <p className="text-ink-soft">
              Rules evaluated after every transaction; webhook fires when the
              condition is breached over the rolling window.
            </p>
          </div>
          <Link
            href="/alerts/new"
            className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm whitespace-nowrap"
          >
            + New rule
          </Link>
        </div>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-2">Active rules</h2>
          {rules.length === 0 ? (
            <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
              No alert rules yet. Create one to get notified when traffic
              degrades.
            </div>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => {
                const scope = r.endpoint
                  ? `endpoint: ${r.endpoint.name}`
                  : r.partner
                    ? `partner: ${r.partner.name}`
                    : "global";
                return (
                  <li key={r.id}>
                    <Link
                      href={`/alerts/${r.id}`}
                      className="block border border-border rounded p-3 bg-paper hover:bg-paper-cream transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{r.name}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              r.active
                                ? "bg-brand-green-soft text-brand-green"
                                : "bg-paper-cream text-ink-mute"
                            }`}
                          >
                            {r.active ? "active" : "paused"}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
                            {r.channel}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-ink-soft mt-1">
                        <code className="font-mono">
                          {CONDITION_LABEL[r.condition] ?? r.condition}{" "}
                          {r.condition === "error_rate_over"
                            ? `${(r.threshold * 100).toFixed(0)}%`
                            : r.threshold}
                        </code>{" "}
                        over {r.windowMin}m · {scope}
                      </div>
                      <div className="text-[10px] text-ink-mute mt-1">
                        {r._count.events} fire{r._count.events === 1 ? "" : "s"}
                        {r.lastTriggeredAt &&
                          ` · last fired ${r.lastTriggeredAt.toLocaleString()}`}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">Recent fires</h2>
          {recentEvents.length === 0 ? (
            <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
              No alerts have fired yet.
            </div>
          ) : (
            <ul className="space-y-1">
              {recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="border border-border rounded p-2 bg-paper text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/alerts/${e.rule.id}`}
                      className="font-semibold text-brand-blue hover:underline truncate max-w-[14rem]"
                    >
                      {e.rule.name}
                    </Link>
                    <span className="font-mono text-ink-mute">
                      {e.triggeredAt.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-brand-red mt-0.5">{e.summary}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
