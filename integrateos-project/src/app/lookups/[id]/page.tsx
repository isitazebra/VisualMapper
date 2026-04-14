import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { LookupForm } from "@/components/workspace/LookupForm";

export const dynamic = "force-dynamic";

export default async function EditLookupPage({
  params,
}: {
  params: { id: string };
}) {
  const dbError = await checkDb();
  if (dbError) return <DbSetupBanner error={dbError} />;

  const [row, partners] = await Promise.all([
    prisma.lookupTable.findUnique({ where: { id: params.id } }),
    prisma.partner.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!row) notFound();

  const entries =
    row.entries && typeof row.entries === "object" && !Array.isArray(row.entries)
      ? (row.entries as Record<string, string>)
      : {};

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/lookups" className="text-xs text-ink-mute hover:underline">
          ← Lookup tables
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1 font-mono">{row.name}</h1>
        <p className="text-ink-mute text-xs mb-6">
          {Object.keys(entries).length} entries · created {row.createdAt.toLocaleString()}
        </p>
        <LookupForm
          lookupId={row.id}
          initial={{
            name: row.name,
            description: row.description,
            partnerId: row.partnerId,
            entries,
          }}
          partners={partners}
        />
      </div>
    </main>
  );
}
