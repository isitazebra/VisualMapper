import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** X12 810 Invoice. */
export const TX_810_SOURCE: SchemaNode[] = [
  N("big", "BIG", "Invoice Beginning", 0, "group", { kids: ["big1", "big2", "big3", "big4"] }),
  N("big1", "BIG*01", "Invoice Date", 1, "el", { sample: "20240320" }),
  N("big2", "BIG*02", "Invoice #", 1, "el", { sample: "INV-88421" }),
  N("big3", "BIG*03", "PO Date", 1, "el", { sample: "20240315" }),
  N("big4", "BIG*04", "PO Number", 1, "el", { sample: "PO-88712" }),
  N("it1", "IT1 Loop", "Line Items", 0, "loop", {
    max: "999",
    kids: ["it101", "it102", "it103", "it104", "it107"],
  }),
  N("it101", "IT1*01", "Line #", 1, "el", { sample: "1" }),
  N("it102", "IT1*02", "Qty Invoiced", 1, "el", { sample: "48" }),
  N("it103", "IT1*03", "UOM", 1, "el", { sample: "CA" }),
  N("it104", "IT1*04", "Unit Price", 1, "el", { sample: "24.99" }),
  N("it107", "IT1*07", "UPC", 1, "el", { sample: "012345678905" }),
  N("tds", "TDS", "Total Amount", 0, "group", { kids: ["tds1"] }),
  N("tds1", "TDS*01", "Total Invoice Amt", 1, "el", { sample: "119952" }),
];
