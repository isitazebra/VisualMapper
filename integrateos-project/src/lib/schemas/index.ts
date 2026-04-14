import type { SchemaNode, TargetFormat, TxType } from "../types";
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

/** Source body segments keyed by X12 transaction type. */
const SOURCE_BODIES: Record<TxType, SchemaNode[]> = {
  "204": TX_204_SOURCE,
  "990": TX_990_SOURCE,
  "214": TX_214_SOURCE,
  "210": TX_210_SOURCE,
  "850": TX_850_SOURCE,
  "855": TX_855_SOURCE,
  "856": TX_856_SOURCE,
  "810": TX_810_SOURCE,
};

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

/** Returns the full source tree (envelope + body) for a tx type. */
export function getSourceSchema(tx: TxType): SchemaNode[] {
  return [...ENVELOPE, ...(SOURCE_BODIES[tx] ?? [])];
}

/** Returns the target tree for a tx × format combination. */
export function getTargetSchema(tx: TxType, fmt: TargetFormat): SchemaNode[] {
  switch (fmt) {
    case "xml":
      return XML_TARGETS[tx] ?? [];
    case "json":
      return JSON_TARGET_DEFAULT;
    case "otm_xml":
      return OTM_TARGET_DEFAULT;
    case "csv":
      return CSV_TARGET_DEFAULT;
    default:
      return XML_TARGETS[tx] ?? [];
  }
}
