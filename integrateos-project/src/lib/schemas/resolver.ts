/**
 * Server-side schema resolution. Schemas come from two places:
 *
 *   1. The in-code registry (`getSchemaById`) for built-ins like
 *      `x12:204`, `xml:850`, `json:default`.
 *   2. The `Schema` Postgres table for user-uploaded customs with ids
 *      shaped like `custom:<cuid>`.
 *
 * Use `resolveSchema` from server components / route handlers. Client
 * components should receive pre-resolved `SchemaDescriptor` objects via
 * props instead of doing their own lookups.
 */
import type { SchemaNode } from "../types";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getSchemaById, type SchemaDescriptor, type SchemaFormat } from "./registry";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function resolveSchema(
  prisma: PrismaLike,
  id: string,
): Promise<SchemaDescriptor | null> {
  const builtin = getSchemaById(id);
  if (builtin) return builtin;

  if (!id.startsWith("custom:")) return null;
  const row = await prisma.schema.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    kind: "custom",
    role: row.role as SchemaDescriptor["role"],
    format: row.format as SchemaFormat,
    displayName: row.displayName,
    description: row.description ?? undefined,
    nodes: row.nodes as unknown as SchemaNode[],
  };
}

/** Batch lookup — returns an array with `null` for any unknown id. */
export async function resolveSchemas(
  prisma: PrismaLike,
  ids: string[],
): Promise<Array<SchemaDescriptor | null>> {
  const results: Array<SchemaDescriptor | null> = [];
  const customIds: string[] = [];
  const customIndex = new Map<string, number>();

  for (let i = 0; i < ids.length; i++) {
    const builtin = getSchemaById(ids[i]);
    if (builtin) {
      results.push(builtin);
    } else if (ids[i].startsWith("custom:")) {
      results.push(null);
      customIds.push(ids[i]);
      customIndex.set(ids[i], i);
    } else {
      results.push(null);
    }
  }

  if (customIds.length > 0) {
    const rows = await prisma.schema.findMany({ where: { id: { in: customIds } } });
    for (const row of rows) {
      const idx = customIndex.get(row.id);
      if (idx === undefined) continue;
      results[idx] = {
        id: row.id,
        kind: "custom",
        role: row.role as SchemaDescriptor["role"],
        format: row.format as SchemaFormat,
        displayName: row.displayName,
        description: row.description ?? undefined,
        nodes: row.nodes as unknown as SchemaNode[],
      };
    }
  }

  return results;
}

/** Lists all available schemas (built-in + custom) for picker UIs. */
export async function listAllSchemas(
  prisma: PrismaLike,
  filter?: { role?: SchemaDescriptor["role"]; partnerId?: string | null },
): Promise<SchemaDescriptor[]> {
  const { BUILTIN_SCHEMAS } = await import("./registry");
  const custom = await prisma.schema.findMany({
    where: {
      ...(filter?.role ? { role: filter.role } : {}),
      ...(filter?.partnerId !== undefined
        ? { OR: [{ partnerId: null }, { partnerId: filter.partnerId }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const customDesc: SchemaDescriptor[] = custom.map((row) => ({
    id: row.id,
    kind: "custom",
    role: row.role as SchemaDescriptor["role"],
    format: row.format as SchemaFormat,
    displayName: row.displayName,
    description: row.description ?? undefined,
    nodes: row.nodes as unknown as SchemaNode[],
  }));
  const builtins = filter?.role
    ? BUILTIN_SCHEMAS.filter((s) => s.role === filter.role || s.role === "both")
    : BUILTIN_SCHEMAS;
  return [...builtins, ...customDesc];
}
