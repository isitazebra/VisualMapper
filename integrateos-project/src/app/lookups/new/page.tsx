import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { LookupForm } from "@/components/workspace/LookupForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New lookup table — IntegrateOS",
};

export default async function NewLookupPage() {
  const dbError = await checkDb();
  if (dbError) return <DbSetupBanner error={dbError} />;

  const partners = await prisma.partner.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/lookups" className="text-xs text-ink-mute hover:underline">
          ← Lookup tables
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">New lookup table</h1>
        <p className="text-ink-soft mb-6">
          Give it a stable name (your <code className="font-mono">lookup</code> rules
          will reference this name), pick a scope, and paste the entries.
        </p>
        <LookupForm partners={partners} />
      </div>
    </main>
  );
}
