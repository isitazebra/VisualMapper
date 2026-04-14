import type { SchemaNode, TargetFormat, TxType } from "../types";
import {
  BUILTIN_SCHEMAS,
  builtinSourceSchemaId,
  builtinTargetSchemaId,
  getSchemaById,
} from "./registry";

export {
  BUILTIN_SCHEMAS,
  builtinSourceSchemaId,
  builtinTargetSchemaId,
  getSchemaById,
};
export type { SchemaDescriptor, SchemaFormat } from "./registry";

/** Human-readable labels for the tx type selector. */
export const TX_LABELS: Record<TxType, string> = {
  "204": "204 Load Tender",
  "990": "990 Response",
  "214": "214 Shipment Status",
  "210": "210 Freight Invoice",
  "850": "850 Purchase Order",
  "855": "855 PO Ack",
  "856": "856 ASN",
  "810": "810 Invoice",
};

export const FMT_LABELS: Record<TargetFormat, string> = {
  xml: "Internal XML",
  json: "JSON API",
  otm_xml: "OTM XML",
  csv: "CSV/Flat File",
};

export const EDI_VERSIONS = ["3040", "4010", "4030", "5010"] as const;

/** Default customer list for override UI. */
export const CUSTOMERS = [
  "(Base)",
  "UPS SCS",
  "Blommer",
  "RAVAGO",
  "Zaxbys",
  "GordonFoods",
  "Elanco",
  "Kroger",
  "MapleHill",
  "Grainger",
  "AVON",
  "Heineken",
  "NLM",
  "DirectTV",
];

/** Resolves a schema id to its node tree. Returns [] for unknown ids. */
export function getSchemaNodes(id: string): SchemaNode[] {
  return getSchemaById(id)?.nodes ?? [];
}

/**
 * Legacy tx-driven lookup — still used by the ephemeral /mapper route.
 * Persisted mappings should resolve via `getSchemaNodes(schemaId)` instead.
 */
export function getSourceSchema(tx: TxType): SchemaNode[] {
  return getSchemaNodes(builtinSourceSchemaId(tx));
}

/**
 * Legacy tx × format target lookup — still used by the ephemeral /mapper
 * route. Persisted mappings should resolve via `getSchemaNodes(schemaId)`.
 */
export function getTargetSchema(tx: TxType, fmt: TargetFormat): SchemaNode[] {
  return getSchemaNodes(builtinTargetSchemaId(tx, fmt));
}
