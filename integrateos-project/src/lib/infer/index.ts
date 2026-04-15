import type { SchemaNode } from "../types";
import type { SchemaFormat } from "../schemas/registry";
import { inferJsonSchema } from "./json";
import { inferXmlSchema } from "./xml";
import { inferCsvSchema } from "./csv";
import { inferX12Schema } from "./x12";
import { inferEdifactSchema } from "./edifact";

/**
 * Unified sample → schema inference. Given a raw sample string and a
 * format hint, returns a flat list of SchemaNode rows in the same shape
 * the mapper uses for built-in schemas.
 *
 * Throws on parse errors — callers should catch and surface to the user.
 */
export function inferSchemaFromSample(format: SchemaFormat, sample: string): SchemaNode[] {
  switch (format) {
    case "json":
      return inferJsonSchema(sample);
    case "xml":
    case "otm_xml":
      return inferXmlSchema(sample);
    case "csv":
      return inferCsvSchema(sample);
    case "x12":
      return inferX12Schema(sample);
    case "edifact":
      return inferEdifactSchema(sample);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
