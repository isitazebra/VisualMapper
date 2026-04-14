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
  const [source, target] = await resolveSchemas(prisma, [
    hydrated.sourceSchemaId,
    hydrated.targetSchemaId,
  ]);

  // Load all lookup tables visible to this partner (global + partner-
  // scoped) so the live preview can execute `lookup` rules.
  const lookups = await prisma.lookupTable.findMany({
    where: {
      OR: [{ partnerId: null }, { partnerId: params.partnerId }],
    },
  });
  const lookupTables: Record<string, Record<string, string>> = {};
  for (const row of lookups) {
    if (
      row.entries &&
      typeof row.entries === "object" &&
      !Array.isArray(row.entries)
    ) {
      lookupTables[row.name] = row.entries as Record<string, string>;
    }
  }

  return (
    <MappingStudio
      initialSpec={hydrated}
      sourceDescriptor={source ?? undefined}
      targetDescriptor={target ?? undefined}
      lookupTables={lookupTables}
    />
  );
}
