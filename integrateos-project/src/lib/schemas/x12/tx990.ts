import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** X12 990 Response to Load Tender. */
export const TX_990_SOURCE: SchemaNode[] = [
  N("b1", "B1", "Response Beginning", 0, "group", { kids: ["b101", "b102", "b103", "b104"] }),
  N("b101", "B1*01", "SCAC", 1, "el", { sample: "CLLQ" }),
  N("b102", "B1*02", "Shipment ID", 1, "el", { sample: "LD23490685" }),
  N("b103", "B1*03", "Date", 1, "el", { sample: "20250901" }),
  N("b104", "B1*04", "Action Code", 1, "el", { sample: "A" }),
  N("n9r", "N9", "References", 0, "loop", { max: "10", kids: ["n901", "n902"] }),
  N("n901", "N9*01", "Ref Qualifier", 1, "el", { sample: "CN" }),
  N("n902", "N9*02", "Ref ID", 1, "el", { sample: "LD23490685" }),
  N("k1g", "K1", "Decline Remarks", 0, "group", { kids: ["k101"] }),
  N("k101", "K1*01", "Free Form Message", 1, "el", { sample: "EQUIP NOT AVAIL" }),
];
