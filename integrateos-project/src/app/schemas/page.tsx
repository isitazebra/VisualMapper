import Link from "next/link";
import { BUILTIN_SCHEMAS } from "@/lib/schemas";

export const metadata = {
  title: "Schemas — IntegrateOS",
};

/**
 * Schema browser — lists every registered schema with its id, format,
 * role, and node count. Used for sanity-checking the registry and as the
 * landing spot for the custom-schema upload flow (Phase 2.2).
 */
export default function SchemasIndexPage() {
  const groups = {
    sources: BUILTIN_SCHEMAS.filter((s) => s.role === "source"),
    targets: BUILTIN_SCHEMAS.filter((s) => s.role === "target"),
  };

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-ink-mute hover:underline">
          ← Partners
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">Schemas</h1>
        <p className="text-ink-soft mb-6">
          The registry of source and target schemas the mapper can use. Built-ins ship in
          code; Phase 2.2 will add custom schemas inferred from uploaded samples.
        </p>

        <SchemaGroup title="Source schemas" schemas={groups.sources} />
        <SchemaGroup title="Target schemas" schemas={groups.targets} />
      </div>
    </main>
  );
}

function SchemaGroup({
  title,
  schemas,
}: {
  title: string;
  schemas: typeof BUILTIN_SCHEMAS;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-2">{title}</h2>
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
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.displayName}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
                  {s.format}
                </span>
              </div>
              <div className="text-xs text-ink-mute font-mono mt-1">{s.id}</div>
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
