import Link from "next/link";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { computePartnerHealth, type PartnerHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export const metadata = { title: "Health — IntegrateOS" };

export default async function HealthPage({
  searchParams,
}: {
  searchParams: { window?: string };
}) {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const windowMin = parseInt(searchParams.window ?? "1440", 10) || 1440;
  const health = await computePartnerHealth(windowMin);

  const totalVolume = health.reduce((a, p) => a + p.total, 0);
  const totalFailed = health.reduce((a, p) => a + p.failed, 0);
  const overallErrorRate = totalVolume > 0 ? totalFailed / totalVolume : 0;

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <div className="flex items-start justify-between mt-3 mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Partner health</h1>
            <p className="text-ink-soft">
              Runtime stats aggregated across all endpoints per partner.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <WindowLink label="1h" min={60} active={windowMin === 60} />
            <WindowLink label="24h" min={1440} active={windowMin === 1440} />
            <WindowLink label="7d" min={10080} active={windowMin === 10080} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <BigStat label="Total transactions" value={totalVolume} />
          <BigStat
            label="Error rate"
            value={`${(overallErrorRate * 100).toFixed(1)}%`}
            tone={
              overallErrorRate < 0.01
                ? "green"
                : overallErrorRate < 0.05
                  ? "amber"
                  : "red"
            }
          />
          <BigStat label="Failed runs" value={totalFailed} tone={totalFailed > 0 ? "red" : "green"} />
          <BigStat label="Partners" value={health.length} />
        </div>

        {health.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
            No partners yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {health.map((h) => (
              <PartnerCard key={h.partnerId} h={h} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function WindowLink({
  label,
  min,
  active,
}: {
  label: string;
  min: number;
  active: boolean;
}) {
  return (
    <Link
      href={`/health?window=${min}`}
      className={`px-2 py-1 rounded border text-xs font-semibold ${
        active
          ? "border-brand-blue bg-brand-blue-soft text-brand-blue"
          : "border-border bg-paper text-ink-soft hover:bg-paper-cream"
      }`}
    >
      {label}
    </Link>
  );
}

function BigStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "text-brand-green"
      : tone === "amber"
        ? "text-brand-amber"
        : tone === "red"
          ? "text-brand-red"
          : "text-ink";
  return (
    <div className="border border-border rounded p-3 bg-paper">
      <div className="text-[10px] font-bold uppercase text-ink-soft">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function PartnerCard({ h }: { h: PartnerHealth }) {
  const errorTone: "green" | "amber" | "red" =
    h.errorRate < 0.01 ? "green" : h.errorRate < 0.05 ? "amber" : "red";
  const p95Tone: "green" | "amber" | "red" | undefined =
    h.p95Ms === null ? undefined : h.p95Ms < 500 ? "green" : h.p95Ms < 2000 ? "amber" : "red";
  return (
    <div className="border border-border rounded p-4 bg-paper">
      <div className="flex items-center justify-between mb-2">
        <Link
          href={`/workspace/${h.partnerId}`}
          className="font-bold text-ink hover:underline"
        >
          {h.partnerName}
        </Link>
        <Link
          href={`/runs?partnerId=${h.partnerId}`}
          className="text-xs text-brand-blue hover:underline"
        >
          View runs →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <MiniStat label="Volume" value={h.total} />
        <MiniStat
          label="Error rate"
          value={h.total === 0 ? "—" : `${(h.errorRate * 100).toFixed(1)}%`}
          tone={errorTone}
        />
        <MiniStat
          label="P95"
          value={h.p95Ms === null ? "—" : `${h.p95Ms}ms`}
          tone={p95Tone}
        />
      </div>
      <Sparkline values={h.volumeByHour} />
      {h.recentFailures.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[10px] font-bold uppercase text-ink-soft mb-1">
            Recent failures
          </div>
          <ul className="space-y-0.5">
            {h.recentFailures.map((f) => (
              <li key={f.id} className="text-[11px] truncate">
                <Link
                  href={`/runs/${f.id}`}
                  className="font-mono text-brand-red hover:underline"
                >
                  {f.endpointName}
                </Link>
                {" — "}
                <span className="text-ink-soft">{f.errorMessage ?? "unknown"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "text-brand-green"
      : tone === "amber"
        ? "text-brand-amber"
        : tone === "red"
          ? "text-brand-red"
          : "text-ink";
  return (
    <div>
      <div className="text-[9px] font-bold uppercase text-ink-soft">{label}</div>
      <div className={`font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const width = 300;
  const height = 36;
  const step = width / values.length;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-9 block"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-brand-blue"
        points={points}
      />
      {values.map((v, i) => (
        <rect
          key={i}
          x={i * step}
          y={height - (v / max) * height}
          width={Math.max(0.5, step - 1)}
          height={(v / max) * height}
          className="fill-brand-blue/15"
        />
      ))}
    </svg>
  );
}
