import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { flattenDbSpec } from "@/lib/mappingSpec";
import { resolveSchemas } from "@/lib/schemas/resolver";
import { explainMapping } from "@/lib/explain";

export const dynamic = "force-dynamic";

/**
 * Plain-English review of a mapping spec — every rule rendered as a
 * sentence so a reviewer can sanity-check the logic without knowing the
 * rule-type vocabulary. Handy for partner reviews and (later) Excel
 * export.
 */
export default async function MappingReviewPage({
  params,
}: {
  params: { partnerId: string; mappingId: string };
}) {
  const error = await checkDb();
  if (error) return <DbSetupBanner error={error} />;

  const spec = await prisma.mappingSpec.findUnique({
    where: { id: params.mappingId },
    include: { fieldMappings: { include: { overrides: true } } },
  });
  if (!spec || spec.partnerId !== params.partnerId) notFound();

  const partner = await prisma.partner.findUnique({ where: { id: params.partnerId } });

  const hydrated = flattenDbSpec(spec);
  const [source, target] = await resolveSchemas(prisma, [
    hydrated.sourceSchemaId,
    hydrated.targetSchemaId,
  ]);
  if (!source || !target) notFound();

  // Build a lookup from nodeId → node for labels.
  const sourceById = new Map(source.nodes.map((n) => [n.id, n]));
  const targetById = new Map(target.nodes.map((n) => [n.id, n]));

  // Group the flat FieldMap[] into (base, overrides[]) tuples.
  const bases = hydrated.maps.filter((m) => m.co === null);
  const overrideByBase = new Map<string, typeof hydrated.maps>();
  for (const m of hydrated.maps) {
    if (m.co === null) continue;
    const key = `${m.sid}|${m.tid}`;
    const list = overrideByBase.get(key) ?? [];
    list.push(m);
    overrideByBase.set(key, list);
  }

  const groups = bases.map((base) => ({
    base,
    overrides: overrideByBase.get(`${base.sid}|${base.tid}`) ?? [],
    sourceNode: sourceById.get(base.sid),
    targetNode: targetById.get(base.tid),
  }));

  const confirmed = bases.filter((m) => m.ok).length;

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/workspace/${params.partnerId}/mapping/${params.mappingId}`}
          className="text-xs text-ink-mute hover:underline"
        >
          ← Back to studio
        </Link>

        <h1 className="text-3xl font-bold mt-3 mb-1">{spec.name}</h1>
        <div className="text-sm text-ink-mute font-mono mb-1">
          {partner?.name ?? "Unknown partner"} · {source.displayName} →{" "}
          {target.displayName}
        </div>
        <div className="text-xs text-ink-mute mb-8">
          {bases.length} base mappings · {hydrated.maps.length - bases.length} customer
          overrides · {confirmed} confirmed
        </div>

        {groups.length === 0 ? (
          <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
            No mappings yet. Head back to the studio to define some.
          </div>
        ) : (
          <ol className="space-y-3">
            {groups.map((g, idx) => {
              const sentence = explainMapping({
                base: g.base,
                overrides: g.overrides,
                sourceNode: g.sourceNode,
                targetNode: g.targetNode,
              });
              return (
                <li
                  key={g.base.id}
                  className="border border-border rounded bg-paper p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-ink-mute font-mono w-6 text-right">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-mono font-semibold text-ink truncate">
                        {g.sourceNode?.seg ?? g.base.sid}
                      </span>
                      <span className="text-ink-mute">→</span>
                      <span className="text-xs font-mono font-semibold text-brand-purple truncate">
                        {g.targetNode?.seg ?? g.base.tid}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {g.base.ok && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-green-soft text-brand-green">
                          ✓ confirmed
                        </span>
                      )}
                      {g.overrides.length > 0 && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-orange-soft text-brand-orange">
                          {g.overrides.length} override{g.overrides.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{sentence}</p>
                  {g.base.note && (
                    <p className="text-xs text-ink-soft italic mt-2 border-l-2 border-border pl-2">
                      {g.base.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
