import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** X12 855 PO Acknowledgment. */
export const TX_855_SOURCE: SchemaNode[] = [
  N("bak", "BAK", "PO Ack Beginning", 0, "group", { kids: ["bak1", "bak2", "bak3", "bak4"] }),
  N("bak1", "BAK*01", "Ack Type", 1, "el", { sample: "AC" }),
  N("bak2", "BAK*02", "Purpose Code", 1, "el", { sample: "00" }),
  N("bak3", "BAK*03", "PO Number", 1, "el", { sample: "PO-88712" }),
  N("bak4", "BAK*04", "PO Date", 1, "el", { sample: "20240315" }),
  N("ak1", "AK1 Loop", "Line Item Ack", 0, "loop", {
    max: "999",
    kids: ["ak101", "ak102", "ak103", "ak104", "ak105"],
  }),
  N("ak101", "AK1*01", "Line #", 1, "el", { sample: "1" }),
  N("ak102", "AK1*02", "Qty Ordered", 1, "el", { sample: "48" }),
  N("ak103", "AK1*03", "UOM", 1, "el", { sample: "CA" }),
  N("ak104", "AK1*04", "Unit Price", 1, "el", { sample: "24.99" }),
  N("ak105", "AK1*05", "Line Status", 1, "el", { sample: "IA" }),
];
