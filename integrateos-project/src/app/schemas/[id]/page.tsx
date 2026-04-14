import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchemaById } from "@/lib/schemas";
import type { SchemaNode } from "@/lib/types";

/**
 * Schema detail — renders a single schema's node tree so you can audit
 * what the mapper will show. Shown as a nested list; loops/groups are
 * highlighted by a small badge.
 */
export default function SchemaDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const schema = getSchemaById(id);
  if (!schema) notFound();

  const topLevel = topLevelNodes(schema.nodes);

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/schemas" className="text-xs text-ink-mute hover:underline">
          ← Schemas
        </Link>
        <div className="flex items-center gap-3 mt-3 mb-1">
          <h1 className="text-3xl font-bold">{schema.displayName}</h1>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-blue-soft text-brand-blue">
            {schema.format}
          </span>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-paper-cream text-ink-soft">
            {schema.kind} · {schema.role}
          </span>
        </div>
        <div className="text-sm text-ink-mute font-mono mb-2">{schema.id}</div>
        {schema.description && <p className="text-ink-soft mb-6">{schema.description}</p>}

        <section className="border border-border rounded bg-paper p-4">
          <h2 className="text-sm font-bold mb-2">
            Node tree ({schema.nodes.length} total)
          </h2>
          <ul className="text-sm font-mono">
            {topLevel.map((n) => (
              <NodeRow key={n.id} node={n} all={schema.nodes} depth={0} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function topLevelNodes(nodes: SchemaNode[]): SchemaNode[] {
  const childIds = new Set<string>();
  for (const n of nodes) {
    if (n.kids) for (const k of n.kids) childIds.add(k);
  }
  return nodes.filter((n) => !childIds.has(n.id));
}

function NodeRow({
  node,
  all,
  depth,
}: {
  node: SchemaNode;
  all: SchemaNode[];
  depth: number;
}) {
  const kids = (node.kids ?? [])
    .map((id) => all.find((n) => n.id === id))
    .filter((n): n is SchemaNode => !!n);
  return (
    <li style={{ paddingLeft: depth * 14 }} className="py-0.5">
      <span className="inline-flex items-center gap-1.5">
        {node.type === "loop" && (
          <span className="text-[9px] font-bold px-1 rounded bg-brand-amber-soft text-brand-amber">
            LP
          </span>
        )}
        {node.type === "group" && (
          <span className="text-[9px] font-bold px-1 rounded bg-brand-blue-soft text-brand-blue">
            G
          </span>
        )}
        {node.type === "el" && <span className="w-1.5 h-1.5 bg-brand-blue/40 rounded-full" />}
        <span className="text-brand-purple font-semibold">{node.seg}</span>
        <span className="text-ink-soft">— {node.label}</span>
        {node.sample && (
          <span className="text-[10px] text-ink-mute">&nbsp;e.g. &ldquo;{node.sample}&rdquo;</span>
        )}
      </span>
      {kids.length > 0 && (
        <ul>
          {kids.map((k) => (
            <NodeRow key={k.id} node={k} all={all} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
