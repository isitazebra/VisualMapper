import Link from "next/link";
import { BUILTIN_SCHEMAS } from "@/lib/schemas";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import type { SchemaDescriptor } from "@/lib/schemas/registry";
import type { SchemaFormat } from "@/lib/schemas/registry";
import type { SchemaNode } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schemas — IntegrateOS",
};

/**
 * Schema browser — lists every registered schema (built-in + custom).
 * Custom schemas are uploaded via /schemas/new and stored in Postgres.
 */
export default async function SchemasIndexPage() {
  const dbError = await checkDb();
  if (dbError) return <DbSetupBanner error={dbError} />;

  const customRows = await prisma.schema.findMany({ orderBy: { createdAt: "desc" } });
  const customs: SchemaDescriptor[] = customRows.map((row) => ({
    id: row.id,
    kind: "custom",
    role: row.role as SchemaDescriptor["role"],
    format: row.format as SchemaFormat,
    displayName: row.displayName,
    description: row.description ?? undefined,
    nodes: row.nodes as unknown as SchemaNode[],
  }));

  const all = [...BUILTIN_SCHEMAS, ...customs];
  const groups = {
    sources: all.filter((s) => s.role === "source" || s.role === "both"),
    targets: all.filter((s) => s.role === "target" || s.role === "both"),
  };

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>

        <div className="flex items-start justify-between mt-3 mb-1">
          <div>
            <h1 className="text-3xl font-bold">Schemas</h1>
            <p className="text-ink-soft">
              Source and target schemas available for mappings. Built-ins ship in code;
              customs are inferred from uploaded samples.
            </p>
          </div>
          <Link
            href="/schemas/new"
            className="px-4 py-1.5 rounded bg-brand-blue text-white font-semibold text-sm whitespace-nowrap"
          >
            + New from sample
          </Link>
        </div>

        <SchemaGroup title="Source schemas" schemas={groups.sources} />
        <SchemaGroup title="Target schemas" schemas={groups.targets} />
      </div>
    </main>
  );
}

function SchemaGroup({ title, schemas }: { title: string; schemas: SchemaDescriptor[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-2 mt-6">{title}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {schemas.map((s) => {
          const leafCount = s.nodes.filter((n) => n.type === "el").length;
          const loopCount = s.nodes.filter((n) => n.type === "loop").length;
          return (
            <Link
              key={s.id}
              href={`/schemas/${encodeURIComponent(s.id)}`}
              className="block border border-border rounded p-3 bg-paper hover:bg-paper-cream transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{s.displayName}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
                    {s.format}
                  </span>
                  {s.kind === "custom" && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-orange-soft text-brand-orange">
                      custom
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-ink-mute font-mono mt-1 truncate">{s.id}</div>
              {s.description && (
                <div className="text-xs text-ink-soft mt-1 line-clamp-2">{s.description}</div>
              )}
              <div className="text-[10px] text-ink-mute mt-2">
                {leafCount} leaf field{leafCount === 1 ? "" : "s"} · {loopCount} loop
                {loopCount === 1 ? "" : "s"}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
