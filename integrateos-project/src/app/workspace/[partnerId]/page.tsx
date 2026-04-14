import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import {
  NewMappingForm,
  type SchemaSummary,
} from "@/components/workspace/NewMappingForm";
import { BUILTIN_SCHEMAS } from "@/lib/schemas";
import type { SchemaNode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartnerWorkspacePage({
  params,
}: {
  params: { partnerId: string };
}) {
  const error = await checkDb();
  if (error) return <DbSetupBanner error={error} />;

  const [partner, customSchemas] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: params.partnerId },
      include: { mappings: { orderBy: { updatedAt: "desc" } } },
    }),
    prisma.schema.findMany({
      where: { OR: [{ partnerId: null }, { partnerId: params.partnerId }] },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!partner) notFound();

  // Build schema summary lists for the picker. Builtins already know
  // their role; customs come straight from the DB row.
  const schemaSummaries = (role: "source" | "target"): SchemaSummary[] => {
    const builtins = BUILTIN_SCHEMAS.filter(
      (s) => s.role === role || s.role === "both",
    ).map<SchemaSummary>((s) => ({
      id: s.id,
      kind: "builtin",
      role: s.role,
      format: s.format,
      displayName: s.displayName,
      description: s.description ?? null,
      leafCount: s.nodes.filter((n) => n.type === "el").length,
    }));
    const customs = customSchemas
      .filter((r) => r.role === role || r.role === "both")
      .map<SchemaSummary>((r) => ({
        id: r.id,
        kind: "custom",
        role: r.role,
        format: r.format,
        displayName: r.displayName,
        description: r.description,
        leafCount: Array.isArray(r.nodes)
          ? (r.nodes as unknown as SchemaNode[]).filter((n) => n.type === "el").length
          : 0,
      }));
    // Customs first so users see their recent uploads on top.
    return [...customs, ...builtins];
  };

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← All partners
        </Link>

        <div className="flex items-center gap-3 mt-3 mb-1">
          <h1 className="text-3xl font-bold">{partner.name}</h1>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              partner.status === "active"
                ? "bg-brand-green-soft text-brand-green"
                : partner.status === "onboarding"
                  ? "bg-brand-amber-soft text-brand-amber"
                  : "bg-paper-cream text-ink-mute"
            }`}
          >
            {partner.status}
          </span>
        </div>
        <div className="text-sm text-ink-mute font-mono mb-8">
          {partner.scac ?? "—"} · {partner.type}
          {partner.contactEmail && ` · ${partner.contactEmail}`}
        </div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <section>
            <h2 className="text-lg font-bold mb-3">Mapping specs</h2>
            {partner.mappings.length === 0 ? (
              <div className="text-sm text-ink-mute p-4 border border-dashed border-border rounded">
                No mappings yet — create one on the right.
              </div>
            ) : (
              <ul className="space-y-2">
                {partner.mappings.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/workspace/${partner.id}/mapping/${m.id}`}
                      className="block border border-border rounded p-3 bg-paper hover:bg-paper-cream transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{m.name}</div>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-paper-cream text-ink-soft">
                          {m.status}
                        </span>
                      </div>
                      <div className="text-xs text-ink-mute font-mono mt-1">
                        X12 {m.ediVersion} · {m.txType} → {m.targetFormat}
                      </div>
                      <div className="text-[10px] text-ink-mute mt-1">
                        Updated {m.updatedAt.toLocaleString()}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside>
            <div className="border border-border rounded p-4 bg-paper">
              <h2 className="text-base font-bold mb-2">New mapping</h2>
              <NewMappingForm
                partnerId={partner.id}
                sourceSchemas={schemaSummaries("source")}
                targetSchemas={schemaSummaries("target")}
              />
            </div>
            <p className="text-[11px] text-ink-mute mt-3">
              <Link href="/schemas" className="underline">
                Browse all schemas →
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
