/** Helper types + functions shared across the mapping seeders. */
import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";

/** Convenient shape for declaring a base field mapping in seed code. */
export interface SeedMapping {
  sourceFieldId: string;
  targetFieldId: string;
  ruleType: string;
  value?: string;
  condition?: string;
  confirmed?: boolean;
  notes?: string;
  overrides?: SeedOverride[];
}

export interface SeedOverride {
  customerName: string;
  ruleType: string;
  value?: string;
  condition?: string;
  notes?: string;
}

export interface SeedSpec {
  /** Stable slug used to upsert on rerun. */
  slug: string;
  partnerId: string;
  name: string;
  txType: string;
  ediVersion: string;
  sourceFormat: string;
  targetFormat: string;
  sourceSchemaId: string;
  targetSchemaId: string;
  direction?: "inbound" | "outbound";
  status?: "draft" | "review" | "confirmed" | "live";
  samplePayload?: string;
  mappings: SeedMapping[];
}

/**
 * Upsert a mapping spec (idempotent on (partnerId, slug)-as-name). Wipes
 * and re-inserts child FieldMappings + CustomerOverrides so reruns
 * produce the same result without duplicating rows.
 *
 * We stash the seed slug in the `name` field so seeded specs are
 * recognizable and a rerun can find them without a separate table.
 */
export async function upsertSpec(
  prisma: PrismaClient,
  spec: SeedSpec,
): Promise<string> {
  const seededName = `${spec.name} [seed:${spec.slug}]`;

  const existing = await prisma.mappingSpec.findFirst({
    where: {
      partnerId: spec.partnerId,
      name: seededName,
    },
  });

  let specRow;
  if (existing) {
    specRow = await prisma.mappingSpec.update({
      where: { id: existing.id },
      data: {
        name: seededName,
        txType: spec.txType,
        ediVersion: spec.ediVersion,
        sourceFormat: spec.sourceFormat,
        targetFormat: spec.targetFormat,
        sourceSchemaId: spec.sourceSchemaId,
        targetSchemaId: spec.targetSchemaId,
        direction: spec.direction ?? "inbound",
        status: spec.status ?? "draft",
        samplePayload: spec.samplePayload ?? null,
      },
    });
    await prisma.fieldMapping.deleteMany({ where: { mappingSpecId: specRow.id } });
  } else {
    specRow = await prisma.mappingSpec.create({
      data: {
        partnerId: spec.partnerId,
        name: seededName,
        txType: spec.txType,
        ediVersion: spec.ediVersion,
        sourceFormat: spec.sourceFormat,
        targetFormat: spec.targetFormat,
        sourceSchemaId: spec.sourceSchemaId,
        targetSchemaId: spec.targetSchemaId,
        direction: spec.direction ?? "inbound",
        status: spec.status ?? "draft",
        samplePayload: spec.samplePayload ?? null,
      },
    });
  }

  for (const m of spec.mappings) {
    // Deterministic id so reruns keep the same primary key (useful if we
    // ever add FKs pointing at FieldMapping rows).
    const id = deterministicId(`${specRow.id}|${m.sourceFieldId}|${m.targetFieldId}`);
    const fm = await prisma.fieldMapping.create({
      data: {
        id,
        mappingSpecId: specRow.id,
        sourceFieldId: m.sourceFieldId,
        targetFieldId: m.targetFieldId,
        ruleType: m.ruleType,
        value: m.value ?? null,
        condition: m.condition ?? null,
        notes: m.notes ?? null,
        confirmed: m.confirmed ?? false,
      },
    });
    for (const o of m.overrides ?? []) {
      await prisma.customerOverride.create({
        data: {
          id: deterministicId(`${fm.id}|${o.customerName}`),
          fieldMappingId: fm.id,
          customerName: o.customerName,
          ruleType: o.ruleType,
          value: o.value ?? null,
          condition: o.condition ?? null,
          notes: o.notes ?? null,
        },
      });
    }
  }

  console.log(
    `  ${existing ? "↻" : "✓"} ${seededName} — ${spec.mappings.length} mappings, ` +
      `${spec.mappings.reduce((n, m) => n + (m.overrides?.length ?? 0), 0)} overrides`,
  );
  return specRow.id;
}

/** cuid-ish deterministic id from an arbitrary key. */
function deterministicId(key: string): string {
  return "c" + createHash("sha256").update(key).digest("hex").slice(0, 23);
}
