import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { MappingStudio } from "@/components/mapper/MappingStudio";
import { flattenDbSpec } from "@/lib/mappingSpec";

export const dynamic = "force-dynamic";

export default async function MappingStudioPage({
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

  const hydrated = flattenDbSpec(spec);
  return <MappingStudio initialSpec={hydrated} />;
}
