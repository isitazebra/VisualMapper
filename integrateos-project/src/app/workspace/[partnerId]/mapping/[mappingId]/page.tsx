import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { checkDb } from "@/lib/dbHealth";
import { DbSetupBanner } from "@/components/common/DbSetupBanner";
import { MappingStudio } from "@/components/mapper/MappingStudio";
import { flattenDbSpec } from "@/lib/mappingSpec";
import { resolveSchemas } from "@/lib/schemas/resolver";

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
  // Resolve both schema descriptors server-side so the client never has
  // to hit /api/schemas itself.
  const [source, target] = await resolveSchemas(prisma, [
    hydrated.sourceSchemaId,
    hydrated.targetSchemaId,
  ]);

  return (
    <MappingStudio
      initialSpec={hydrated}
      sourceDescriptor={source ?? undefined}
      targetDescriptor={target ?? undefined}
    />
  );
}
