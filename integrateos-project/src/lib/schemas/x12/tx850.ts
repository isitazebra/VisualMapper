import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** X12 850 Purchase Order. */
export const TX_850_SOURCE: SchemaNode[] = [
  N("beg", "BEG", "PO Beginning", 0, "group", {
    kids: ["bg01", "bg02", "bg03", "bg05", "bg06"],
  }),
  N("bg01", "BEG*01", "Purpose Code", 1, "el", { sample: "00" }),
  N("bg02", "BEG*02", "PO Type", 1, "el", { sample: "NE" }),
  N("bg03", "BEG*03", "PO Number", 1, "el", { sample: "PO-2024-88712" }),
  N("bg05", "BEG*05", "PO Date", 1, "el", { sample: "20240315" }),
  N("bg06", "BEG*06", "Contract #", 1, "el", { sample: "CNT-4420" }),
  N("n18", "N1 Loop", "Parties", 0, "loop", {
    max: "10",
    kids: ["n1801", "n1802", "n1804", "n3801", "n4801", "n4802", "n4803"],
  }),
  N("n1801", "N1*01", "Entity Code", 1, "el", { sample: "ST" }),
  N("n1802", "N1*02", "Name", 1, "el", { sample: "Kroger DC #847" }),
  N("n1804", "N1*04", "ID (GLN)", 1, "el", { sample: "0078742000847" }),
  N("n3801", "N3*01", "Address", 1, "el", { sample: "1200 Distribution Way" }),
  N("n4801", "N4*01", "City", 1, "el", { sample: "Nashville" }),
  N("n4802", "N4*02", "State", 1, "el", { sample: "TN" }),
  N("n4803", "N4*03", "Zip", 1, "el", { sample: "37201" }),
  N("po1", "PO1 Loop", "Line Items", 0, "loop", {
    max: "999",
    kids: ["po101", "po102", "po103", "po104", "po107", "po109", "pid5", "sdq", "sdq1", "sdq2", "sdq3"],
  }),
  N("po101", "PO1*01", "Line #", 1, "el", { sample: "1" }),
  N("po102", "PO1*02", "Qty Ordered", 1, "el", { sample: "48" }),
  N("po103", "PO1*03", "UOM", 1, "el", { sample: "CA" }),
  N("po104", "PO1*04", "Unit Price", 1, "el", { sample: "24.99" }),
  N("po107", "PO1*07", "UPC", 1, "el", { sample: "012345678905" }),
  N("po109", "PO1*09", "Buyer Item #", 1, "el", { sample: "KRG-44521" }),
  N("pid5", "PID*05", "Description", 1, "el", { sample: "Organic Wheat Bread" }),
  N("sdq", "SDQ Loop", "Store Allocation", 1, "loop", { max: "50", kids: ["sdq1", "sdq2", "sdq3"] }),
  N("sdq1", "SDQ*01", "UOM", 2, "el", { sample: "CA" }),
  N("sdq2", "SDQ*02", "Store ID", 2, "el", { sample: "STR-0847" }),
  N("sdq3", "SDQ*03", "Qty", 2, "el", { sample: "12" }),
];
