import { node as N } from "../node";
import type { SchemaNode } from "../../types";

/** Oracle Transportation Management (OTM) XML target. */
export const OTM_TARGET_DEFAULT: SchemaNode[] = [
  N("o1", "TransmissionHeader/GLogDate", "Create Date", 0, "el"),
  N("o2", "TransmissionHeader/SenderSystemID", "Sender", 0, "el"),
  N("o3", "PlannedShipment/ShipmentGid", "Shipment ID", 0, "el"),
  N("o4", "PlannedShipment/ServProvGid", "SCAC", 0, "el"),
  N("o5", "PlannedShipment/TransportMode", "Mode", 0, "el"),
  N("o6", "ShipmentStop[]", "Stops", 0, "loop", {
    max: "N",
    kids: ["o61", "o62", "o63", "o64", "o65"],
  }),
  N("o61", "StopSequence", "Seq #", 1, "el"),
  N("o62", "StopType", "Type", 1, "el"),
  N("o63", "LocationGid", "Location", 1, "el"),
  N("o64", "Address/City", "City", 1, "el"),
  N("o65", "EarliestDate", "Date", 1, "el"),
];
