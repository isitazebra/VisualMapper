import Link from "next/link";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { NewEndpointForm } from "@/components/workspace/NewEndpointForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "New endpoint — IntegrateOS" };

export default async function NewEndpointPage() {
  const err = await checkDb();
  if (err) return <DbSetupBanner error={err} />;

  const [partners, mappings] = await Promise.all([
    prisma.partner.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.mappingSpec.findMany({
      select: {
        id: true,
        name: true,
        partnerId: true,
        txType: true,
        targetFormat: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <Link href="/endpoints" className="text-xs text-ink-mute hover:underline">
          ← Endpoints
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">New endpoint</h1>
        <p className="text-ink-soft mb-6">
          Bind a URL token to a mapping spec. Optionally configure an egress URL
          so inbound traffic gets forwarded.
        </p>
        <NewEndpointForm partners={partners} mappings={mappings} />
      </div>
    </main>
  );
}
