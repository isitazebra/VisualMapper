/**
 * Serialization layer between the mapping studio's reducer state and the
 * Prisma MappingSpec + FieldMapping + CustomerOverride tables.
 *
 * The reducer stores a flat `maps: FieldMap[]`. Entries with `co === null`
 * are the base rule; entries with `co !== null` are customer overrides
 * that reference the base by `(sid, tid)` (the source and target node ids).
 * In the DB, overrides reference the base via `fieldMappingId`.
 */
import type {
  FieldMapping as DbFieldMapping,
  CustomerOverride as DbCustomerOverride,
  MappingSpec as DbMappingSpec,
} from "@prisma/client";

import type {
  EdiVersion,
  FieldMap,
  RuleTypeId,
  TargetFormat,
  TxType,
} from "./types";

/** Shape returned by GET /api/mappings/[id] and consumed on the client. */
export interface HydratedMappingSpec {
  id: string;
  partnerId: string;
  name: string;
  txType: TxType;
  ediVersion: EdiVersion;
  targetFormat: TargetFormat;
  status: string;
  maps: FieldMap[];
}

/** Shape accepted by PATCH /api/mappings/[id]. */
export interface MappingSpecUpdate {
  name?: string;
  txType?: TxType;
  ediVersion?: EdiVersion;
  targetFormat?: TargetFormat;
  status?: string;
  maps: FieldMap[];
}

type DbFieldMappingWithOverrides = DbFieldMapping & {
  overrides: DbCustomerOverride[];
};

type DbSpecWithChildren = DbMappingSpec & {
  fieldMappings: DbFieldMappingWithOverrides[];
};

/** Flattens a Prisma MappingSpec + children into the reducer's FieldMap[] shape. */
export function flattenDbSpec(spec: DbSpecWithChildren): HydratedMappingSpec {
  const maps: FieldMap[] = [];

  for (const fm of spec.fieldMappings) {
    maps.push({
      id: fm.id,
      sid: fm.sourceFieldId,
      tid: fm.targetFieldId,
      rt: fm.ruleType as RuleTypeId,
      v: fm.value ?? "",
      co: null,
      cond: fm.condition ?? "",
      ok: fm.confirmed,
      note: fm.notes ?? "",
    });
    for (const ov of fm.overrides) {
      maps.push({
        id: ov.id,
        sid: fm.sourceFieldId,
        tid: fm.targetFieldId,
        rt: ov.ruleType as RuleTypeId,
        v: ov.value ?? "",
        co: ov.customerName,
        cond: ov.condition ?? "",
        ok: !!ov.active && true,
        note: ov.notes ?? "",
      });
    }
  }

  return {
    id: spec.id,
    partnerId: spec.partnerId,
    name: spec.name,
    txType: spec.txType as TxType,
    ediVersion: spec.ediVersion as EdiVersion,
    targetFormat: spec.targetFormat as TargetFormat,
    status: spec.status,
    maps,
  };
}

/**
 * Splits a client-side `FieldMap[]` into rows for the FieldMapping and
 * CustomerOverride tables, resolving each override to its parent base
 * mapping's id by matching on `(sid, tid)`.
 *
 * Overrides whose parent cannot be resolved are dropped (they would
 * violate the FK constraint anyway).
 */
export function splitMapsForDb(
  mappingSpecId: string,
  maps: FieldMap[],
): {
  baseRows: Array<Pick<
    DbFieldMapping,
    "id" | "mappingSpecId" | "sourceFieldId" | "targetFieldId" | "ruleType" | "confirmed"
  > & { value: string | null; condition: string | null; notes: string | null }>;
  overrideRows: Array<Pick<
    DbCustomerOverride,
    "id" | "fieldMappingId" | "customerName" | "ruleType" | "active"
  > & { value: string | null; condition: string | null; notes: string | null }>;
} {
  const bases = maps.filter((m) => m.co === null);
  const overrides = maps.filter((m) => m.co !== null);

  // Build a quick (sid,tid) → base map id lookup. If multiple bases match
  // the same (sid,tid), the first wins — the UI reducer prevents this case
  // but we guard anyway.
  const parentIdBySidTid = new Map<string, string>();
  for (const b of bases) {
    parentIdBySidTid.set(`${b.sid}::${b.tid}`, b.id);
  }

  const baseRows = bases.map((b) => ({
    id: b.id,
    mappingSpecId,
    sourceFieldId: b.sid,
    targetFieldId: b.tid,
    ruleType: b.rt,
    value: b.v || null,
    condition: b.cond || null,
    notes: b.note || null,
    confirmed: b.ok,
  }));

  const overrideRows = overrides
    .map((o) => {
      const parentId = parentIdBySidTid.get(`${o.sid}::${o.tid}`);
      if (!parentId) return null;
      return {
        id: o.id,
        fieldMappingId: parentId,
        customerName: o.co as string,
        ruleType: o.rt,
        value: o.v || null,
        condition: o.cond || null,
        notes: o.note || null,
        active: true,
      };
    })
    .filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

  return { baseRows, overrideRows };
}
