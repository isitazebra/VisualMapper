import { node as N } from "./node";
import type { SchemaNode } from "../types";

/** Shared X12 ISA/GS/ST envelope — prepended to every source body. */
export const ENVELOPE: SchemaNode[] = [
  N("isa", "ISA", "Interchange Control Header", 0, "group", {
    kids: ["i01", "i02", "i03", "i04", "i05", "i06", "i07", "i08", "i09", "i10", "i11", "i12", "i13", "i14", "i15", "i16"],
  }),
  N("i01", "ISA*01", "Auth Info Qualifier", 1, "el", { sample: "00" }),
  N("i02", "ISA*02", "Auth Information", 1, "el", { sample: "          " }),
  N("i03", "ISA*03", "Security Info Qualifier", 1, "el", { sample: "00" }),
  N("i04", "ISA*04", "Security Information", 1, "el", { sample: "          " }),
  N("i05", "ISA*05", "Sender ID Qualifier", 1, "el", { sample: "ZZ" }),
  N("i06", "ISA*06", "Interchange Sender ID", 1, "el", { sample: "UPSSCNL" }),
  N("i07", "ISA*07", "Receiver ID Qualifier", 1, "el", { sample: "02" }),
  N("i08", "ISA*08", "Interchange Receiver ID", 1, "el", { sample: "CLLQ" }),
  N("i09", "ISA*09", "Interchange Date", 1, "el", { sample: "20250318" }),
  N("i10", "ISA*10", "Interchange Time", 1, "el", { sample: "1430" }),
  N("i11", "ISA*11", "Repetition Separator", 1, "el", { sample: "U" }),
  N("i12", "ISA*12", "Control Version #", 1, "el", { sample: "00401" }),
  N("i13", "ISA*13", "Interchange Control #", 1, "el", { sample: "000017090" }),
  N("i14", "ISA*14", "Ack Requested", 1, "el", { sample: "0" }),
  N("i15", "ISA*15", "Usage Indicator", 1, "el", { sample: "P" }),
  N("i16", "ISA*16", "Component Separator", 1, "el", { sample: '"' }),
  N("gs", "GS", "Functional Group Header", 0, "group", {
    kids: ["g01", "g02", "g03", "g04", "g05", "g06", "g07", "g08"],
  }),
  N("g01", "GS*01", "Functional ID Code", 1, "el", { sample: "SM" }),
  N("g02", "GS*02", "App Sender Code", 1, "el", { sample: "UPSSCNL" }),
  N("g03", "GS*03", "App Receiver Code", 1, "el", { sample: "CLLQ" }),
  N("g04", "GS*04", "Date", 1, "el", { sample: "20250318" }),
  N("g05", "GS*05", "Time", 1, "el", { sample: "143000" }),
  N("g06", "GS*06", "Group Control #", 1, "el", { sample: "1709" }),
  N("g07", "GS*07", "Agency Code", 1, "el", { sample: "X" }),
  N("g08", "GS*08", "Version Code", 1, "el", { sample: "004010" }),
  N("st", "ST", "Transaction Set Header", 0, "group", { kids: ["s01", "s02"] }),
  N("s01", "ST*01", "TX Set ID", 1, "el", { sample: "204" }),
  N("s02", "ST*02", "TX Set Control #", 1, "el", { sample: "017090001" }),
];
