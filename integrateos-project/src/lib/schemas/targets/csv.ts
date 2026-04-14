import { node as N } from "../node";
import type { SchemaNode } from "../../types";

const CSV_COLUMNS = [
  "Shipment ID",
  "SCAC",
  "Origin",
  "Dest",
  "Weight",
  "Pieces",
  "Equipment",
  "Pickup Date",
  "Delivery Date",
  "PO#",
  "BOL#",
  "Notes",
];

export const CSV_TARGET_DEFAULT: SchemaNode[] = CSV_COLUMNS.map((colName, i) =>
  N(`csv${i}`, `Col ${String.fromCharCode(65 + i)}`, colName, 0, "el"),
);
