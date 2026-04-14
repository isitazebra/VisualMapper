import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** X12 214 Shipment Status Message. */
export const TX_214_SOURCE: SchemaNode[] = [
  N("b10", "B10", "Status Beginning", 0, "group", { kids: ["b1001", "b1002", "b1003"] }),
  N("b1001", "B10*01", "Reference ID", 1, "el", { sample: "16566270" }),
  N("b1002", "B10*02", "Shipment ID", 1, "el", { sample: "T2120" }),
  N("b1003", "B10*03", "SCAC", 1, "el", { sample: "CLLQ" }),
  N("l114", "L11", "Reference", 0, "group", { kids: ["l11401", "l11402"] }),
  N("l11401", "L11*01", "Ref ID", 1, "el", { sample: "16566270" }),
  N("l11402", "L11*02", "Ref Qualifier", 1, "el", { sample: "CN" }),
  N("n1l4", "N1 Loop", "Parties", 0, "loop", {
    max: "3",
    kids: ["n14_01", "n14_02", "n34_01", "n44_01", "n44_02", "n44_03", "n44_04"],
  }),
  N("n14_01", "N1*01", "Entity Code", 1, "el", { sample: "SH" }),
  N("n14_02", "N1*02", "Name", 1, "el", { sample: "LINEAGE LOGISTICS" }),
  N("n34_01", "N3*01", "Address", 1, "el", { sample: "2501 BROADWAY" }),
  N("n44_01", "N4*01", "City", 1, "el", { sample: "CHEEKTOWAGA" }),
  N("n44_02", "N4*02", "State", 1, "el", { sample: "NY" }),
  N("n44_03", "N4*03", "Zip", 1, "el", { sample: "14227" }),
  N("n44_04", "N4*04", "Country", 1, "el", { sample: "US" }),
  N("lx4", "LX", "Assigned Number", 0, "group", { kids: ["lx401"] }),
  N("lx401", "LX*01", "Assigned #", 1, "el", { sample: "1" }),
  N("at7", "AT7", "Status Detail", 0, "group", {
    kids: ["at701", "at702", "at703", "at704", "at705", "at706", "at707"],
  }),
  N("at701", "AT7*01", "Status Code", 1, "el", { sample: "X1" }),
  N("at702", "AT7*02", "Reason Code", 1, "el", { sample: "NS" }),
  N("at703", "AT7*03", "Appt Status", 1, "el", { sample: "" }),
  N("at704", "AT7*04", "Appt Reason", 1, "el", { sample: "" }),
  N("at705", "AT7*05", "Date", 1, "el", { sample: "20250509" }),
  N("at706", "AT7*06", "Time", 1, "el", { sample: "1230" }),
  N("at707", "AT7*07", "Time Code", 1, "el", { sample: "PT" }),
  N("ms1", "MS1", "Location", 0, "group", { kids: ["ms101", "ms102", "ms103"] }),
  N("ms101", "MS1*01", "City", 1, "el", { sample: "RIVERSIDE" }),
  N("ms102", "MS1*02", "State", 1, "el", { sample: "CA" }),
  N("ms103", "MS1*03", "Country", 1, "el", { sample: "USA" }),
  N("ms2", "MS2", "Equipment ID", 0, "group", { kids: ["ms201", "ms202"] }),
  N("ms201", "MS2*01", "SCAC", 1, "el", { sample: "CLLQ" }),
  N("ms202", "MS2*02", "Equip #", 1, "el", { sample: "TRL-447821" }),
];
