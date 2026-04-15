import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { RunsSearchInput } from "@/components/workspace/RunsSearchInput";

export const dynamic = "force-dynamic";

export const metadata = { title: "Transaction stream — IntegrateOS" };

export default async function RunsIndexPage({
  searchParams,
}: {
  searchParams: { endpointId?: string; partnerId?: string; status?: string; q?: string };
}) {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const q = searchParams.q?.trim();

  const searchClause = q
    ? {
        OR: [
          { id: { contains: q } },
          { inputPayload: { contains: q, mode: "insensitive" as const } },
          { outputPayload: { contains: q, mode: "insensitive" as const } },
          { errorMessage: { contains: q, mode: "insensitive" as const } },
          { endpoint: { name: { contains: q, mode: "insensitive" as const } } },
          { partner: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const runs = await prisma.transactionRun.findMany({
    where: {
      ...(searchParams.endpointId ? { endpointId: searchParams.endpointId } : {}),
      ...(searchParams.partnerId ? { partnerId: searchParams.partnerId } : {}),
      ...(searchParams.status ? { status: searchParams.status } : {}),
      ...searchClause,
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
    include: {
      endpoint: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
    },
  });

  const counts = {
    delivered: runs.filter((r) => r.status === "delivered").length,
    transformed: runs.filter((r) => r.status === "transformed").length,
    failed: runs.filter((r) => r.status === "failed").length,
  };

  // Build base href that preserves all current filters except the one
  // a status pill toggles (so search + partner filter stick).
  const baseQs = new URLSearchParams();
  if (searchParams.partnerId) baseQs.set("partnerId", searchParams.partnerId);
  if (searchParams.endpointId) baseQs.set("endpointId", searchParams.endpointId);
  if (q) baseQs.set("q", q);
  const hrefWithStatus = (status?: string) => {
    const qs = new URLSearchParams(baseQs);
    if (status) qs.set("status", status);
    const s = qs.toString();
    return `/runs${s ? `?${s}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <div className="flex items-start justify-between mt-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Transaction stream</h1>
            <p className="text-ink-soft">
              Every inbound request creates a TransactionRun. Most recent first.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <StatusPill count={counts.delivered} label="delivered" tone="green" />
            <StatusPill count={counts.failed} label="failed" tone="red" />
          </div>
        </div>

        <RunsSearchInput
          initial={q ?? ""}
          partnerId={searchParams.partnerId}
          endpointId={searchParams.endpointId}
          status={searchParams.status}
        />

        <div className="flex gap-2 mb-3 mt-3">
          <FilterLink label="All" href={hrefWithStatus()} active={!searchParams.status} />
          <FilterLink
            label="Delivered"
            href={hrefWithStatus("delivered")}
            active={searchParams.status === "delivered"}
          />
          <FilterLink
            label="Failed"
            href={hrefWithStatus("failed")}
            active={searchParams.status === "failed"}
          />
        </div>

        {q && (
          <div className="text-xs text-ink-mute mb-2">
            Searching for <code className="font-mono bg-paper-cream px-1 rounded">{q}</code>{" "}
            — {runs.length} match{runs.length === 1 ? "" : "es"} (id, payloads, error
            message, endpoint name, partner name).
          </div>
        )}

        {runs.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
            {q ? "No runs match your search." : "No transactions yet."}{" "}
            {!q && (
              <>
                <Link href="/endpoints/new" className="underline">
                  Create an endpoint
                </Link>{" "}
                and send it a payload to see runs here.
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-xs border border-border rounded bg-paper">
            <thead>
              <tr className="bg-paper-cream text-ink-soft uppercase font-bold text-[10px]">
                <Th>Received</Th>
                <Th>Status</Th>
                <Th>Endpoint</Th>
                <Th>Partner</Th>
                <Th>Size</Th>
                <Th>Duration</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-paper-cream">
                  <Td>
                    <Link
                      href={`/runs/${r.id}`}
                      className="font-mono text-brand-blue hover:underline"
                    >
                      {r.receivedAt.toLocaleString()}
                    </Link>
                  </Td>
                  <Td>
                    <StatusPill count={null} label={r.status} tone={toneOf(r.status)} />
                  </Td>
                  <Td className="font-mono truncate max-w-[14rem]">{r.endpoint.name}</Td>
                  <Td>{r.partner.name}</Td>
                  <Td className="font-mono">
                    {r.inputSize}
                    {r.outputSize !== null ? ` / ${r.outputSize}` : ""}B
                  </Td>
                  <Td className="font-mono">{r.durationMs ?? "—"}ms</Td>
                  <Td className="truncate max-w-[24rem] text-brand-red">
                    {r.errorMessage ?? ""}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1 text-left font-bold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1 ${className ?? ""}`}>{children}</td>;
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
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

function toneOf(status: string): "green" | "red" | "amber" {
  if (status === "delivered") return "green";
  if (status === "failed") return "red";
  return "amber";
}

function StatusPill({
  count,
  label,
  tone,
}: {
  count: number | null;
  label: string;
  tone: "green" | "red" | "amber";
}) {
  const bg =
    tone === "green"
      ? "bg-brand-green-soft text-brand-green"
      : tone === "red"
        ? "bg-brand-red/10 text-brand-red"
        : "bg-brand-amber-soft text-brand-amber";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${bg}`}
    >
      {count !== null && <span>{count}</span>}
      <span>{label}</span>
    </span>
  );
}
