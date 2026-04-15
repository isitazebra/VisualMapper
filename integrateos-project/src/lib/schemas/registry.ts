import type { EdiVersion, SchemaNode, TargetFormat, TxType } from "../types";
import { ENVELOPE } from "./envelope";

import { TX_204_SOURCE } from "./x12/tx204";
import { TX_990_SOURCE } from "./x12/tx990";
import { TX_214_SOURCE } from "./x12/tx214";
import { TX_210_SOURCE } from "./x12/tx210";
import { TX_850_SOURCE } from "./x12/tx850";
import { TX_855_SOURCE } from "./x12/tx855";
import { TX_856_SOURCE } from "./x12/tx856";
import { TX_810_SOURCE } from "./x12/tx810";

import { XML_TARGETS } from "./targets/xml";
import { JSON_TARGET_DEFAULT } from "./targets/json";
import { OTM_TARGET_DEFAULT } from "./targets/otm";
import { CSV_TARGET_DEFAULT } from "./targets/csv";

/** The wire formats the registry currently understands. */
export type SchemaFormat = "x12" | "xml" | "json" | "otm_xml" | "csv";

/**
 * Top-level schema descriptor. A MappingSpec references two of these via
 * their stable `id`: one source, one target.
 *
 * Built-in schemas live in code and are registered below. Custom schemas
 * (Phase 2.2) are inferred from user-uploaded samples and stored in the
 * `Schema` table — they use the same descriptor shape with `kind:"custom"`.
 */
export interface SchemaDescriptor {
  /** Stable identifier — used as the FK value in MappingSpec. */
  id: string;
  kind: "builtin" | "custom";
  /** Whether this schema is typically used as a source, target, or either. */
  role: "source" | "target" | "both";
  format: SchemaFormat;
  /** Human-readable label for the schema browser and toolbar. */
  displayName: string;
  /** Optional short description — shown on the schema browser card. */
  description?: string;
  /** Filled in for X12 schemas so the UI can show "X12 4010" badges. */
  txType?: TxType;
  ediVersion?: EdiVersion;
  nodes: SchemaNode[];
}

function x12Source(tx: TxType, label: string, body: SchemaNode[]): SchemaDescriptor {
  return {
    id: `x12:${tx}`,
    kind: "builtin",
    // Same schema works as either source (parse an inbound X12) or
    // target (generate an outbound X12) — Phase 2.5g added the X12
    // emitter.
    role: "both",
    format: "x12",
    displayName: `X12 ${tx} ${label}`,
    description: `X12 ${label} — ISA/GS/ST envelope + ${tx} body`,
    txType: tx,
    nodes: [...ENVELOPE, ...body],
  };
}

function xmlTarget(tx: TxType, label: string): SchemaDescriptor {
  return {
    id: `xml:${tx}`,
    kind: "builtin",
    role: "target",
    format: "xml",
    displayName: `Internal XML — ${label}`,
    description: `Internal XML target shape for the ${tx} transaction.`,
    txType: tx,
    nodes: XML_TARGETS[tx],
  };
}

const JSON_DEFAULT: SchemaDescriptor = {
  id: "json:default",
  kind: "builtin",
  role: "target",
  format: "json",
  displayName: "JSON API (generic shipment)",
  description:
    "Generic JSON shape suitable for a REST shipment API. Nested objects for " +
    "location, arrays for references and stops.",
  nodes: JSON_TARGET_DEFAULT,
};

const OTM_DEFAULT: SchemaDescriptor = {
  id: "otm_xml:default",
  kind: "builtin",
  role: "target",
  format: "otm_xml",
  displayName: "Oracle OTM XML (generic)",
  description: "Planned shipment shape compatible with Oracle Transportation Management.",
  nodes: OTM_TARGET_DEFAULT,
};

const CSV_DEFAULT: SchemaDescriptor = {
  id: "csv:default",
  kind: "builtin",
  role: "target",
  format: "csv",
  displayName: "CSV / flat file (shipment columns)",
  description: "Generic 12-column CSV suitable for a flat-file drop.",
  nodes: CSV_TARGET_DEFAULT,
};

/** All built-in schema descriptors. Order is preserved for UI listings. */
export const BUILTIN_SCHEMAS: SchemaDescriptor[] = [
  x12Source("204", "Load Tender", TX_204_SOURCE),
  x12Source("990", "Response to Load Tender", TX_990_SOURCE),
  x12Source("214", "Shipment Status", TX_214_SOURCE),
  x12Source("210", "Freight Invoice", TX_210_SOURCE),
  x12Source("850", "Purchase Order", TX_850_SOURCE),
  x12Source("855", "PO Acknowledgment", TX_855_SOURCE),
  x12Source("856", "Advance Ship Notice", TX_856_SOURCE),
  x12Source("810", "Invoice", TX_810_SOURCE),
  xmlTarget("204", "204 Load Tender"),
  xmlTarget("990", "990 Response"),
  xmlTarget("214", "214 Shipment Status"),
  xmlTarget("210", "210 Freight Invoice"),
  xmlTarget("850", "850 Purchase Order"),
  xmlTarget("855", "855 PO Ack"),
  xmlTarget("856", "856 ASN"),
  xmlTarget("810", "810 Invoice"),
  JSON_DEFAULT,
  OTM_DEFAULT,
  CSV_DEFAULT,
];

const BUILTIN_BY_ID = new Map(BUILTIN_SCHEMAS.map((s) => [s.id, s]));

/** Look up a schema descriptor by id. Returns null for unknown ids. */
export function getSchemaById(id: string): SchemaDescriptor | null {
  return BUILTIN_BY_ID.get(id) ?? null;
}

/** Returns the built-in source schema id for an X12 transaction type. */
export function builtinSourceSchemaId(tx: TxType): string {
  return `x12:${tx}`;
}

/** Returns the built-in target schema id for a tx × format combo. */
export function builtinTargetSchemaId(tx: TxType, fmt: TargetFormat): string {
  switch (fmt) {
    case "xml":
      return `xml:${tx}`;
    case "json":
      return "json:default";
    case "otm_xml":
      return "otm_xml:default";
    case "csv":
      return "csv:default";
  }
}
