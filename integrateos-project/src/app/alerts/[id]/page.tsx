import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { AlertDetailClient } from "@/components/workspace/AlertDetailClient";

export const dynamic = "force-dynamic";

const CONDITION_LABEL: Record<string, string> = {
  error_rate_over: "Error rate ≥",
  failure_count: "Failures ≥",
  volume_drop: "Volume <",
};

export default async function AlertDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const rule = await prisma.alertRule.findUnique({
    where: { id: params.id },
    include: {
      partner: { select: { id: true, name: true } },
      endpoint: { select: { id: true, name: true } },
      events: { orderBy: { triggeredAt: "desc" }, take: 100 },
    },
  });
  if (!rule) notFound();

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/alerts" className="text-xs text-ink-mute hover:underline">
          ← Alerts
        </Link>
        <div className="flex items-center gap-3 mt-3 mb-1">
          <h1 className="text-3xl font-bold">{rule.name}</h1>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              rule.active
                ? "bg-brand-green-soft text-brand-green"
                : "bg-paper-cream text-ink-mute"
            }`}
          >
            {rule.active ? "active" : "paused"}
          </span>
        </div>
        <div className="text-sm text-ink-mute mb-6 font-mono">
          {CONDITION_LABEL[rule.condition] ?? rule.condition}{" "}
          {rule.condition === "error_rate_over"
            ? `${(rule.threshold * 100).toFixed(0)}%`
            : rule.threshold}{" "}
          over {rule.windowMin}m ·{" "}
          {rule.endpoint
            ? `endpoint: ${rule.endpoint.name}`
            : rule.partner
              ? `partner: ${rule.partner.name}`
              : "global"}
        </div>

        <AlertDetailClient rule={rule} />

        <section className="mt-8">
          <h2 className="text-base font-bold mb-2">Fire history</h2>
          {rule.events.length === 0 ? (
            <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
              This rule hasn&apos;t fired yet.
            </div>
          ) : (
            <ul className="space-y-1">
              {rule.events.map((ev) => (
                <li
                  key={ev.id}
                  className="border border-border rounded p-2 bg-paper text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-ink-mute">
                      {ev.triggeredAt.toLocaleString()}
                    </span>
                    <span className="text-brand-red">{ev.summary}</span>
                  </div>
                  <details className="mt-1">
                    <summary className="text-[10px] text-ink-mute cursor-pointer">
                      Payload
                    </summary>
                    <pre className="mt-1 text-[10px] font-mono bg-paper-cream p-1 rounded overflow-x-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
