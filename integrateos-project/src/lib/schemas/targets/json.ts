import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** Generic JSON-API target. Used as a fallback for any tx type. */
export const JSON_TARGET_DEFAULT: SchemaNode[] = [
  N("j1", ".carrierScac", "Carrier SCAC", 0, "el"),
  N("j2", ".shipmentId", "Shipment ID", 0, "el"),
  N("j3", ".status", "Status", 0, "el"),
  N("j4", ".references[]", "Refs", 0, "loop", { max: "N", kids: ["j41", "j42"] }),
  N("j41", ".qualifier", "Qualifier", 1, "el"),
  N("j42", ".value", "Value", 1, "el"),
  N("j5", ".stops[]", "Stops", 0, "loop", {
    max: "N",
    kids: ["j51", "j52", "j53", "j54", "j55", "j56"],
  }),
  N("j51", ".stopType", "Type", 1, "el"),
  N("j52", ".location.name", "Name", 1, "el"),
  N("j53", ".location.city", "City", 1, "el"),
  N("j54", ".location.state", "State", 1, "el"),
  N("j55", ".eventDate", "Date", 1, "el"),
  N("j56", ".eventTime", "Time", 1, "el"),
  N("j6", ".weight", "Weight", 0, "el"),
  N("j7", ".pieces", "Pieces", 0, "el"),
];
