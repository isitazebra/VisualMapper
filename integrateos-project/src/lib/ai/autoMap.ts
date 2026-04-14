/**
 * Bulk semantic auto-map. Sends the full source + target schemas to
 * Claude and asks for one mapping operation per target leaf, with a
 * confidence score and a short per-field reason.
 *
 * Shares plumbing with compose.ts — same Anthropic client, same cache
 * structure, same rule-type vocabulary. The tool schema is separate
 * because the shape diverges (confidence + aiReasoning per op, no
 * free-text `reasoning` on the whole response — bulk summaries are
 * less useful than per-op notes).
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { AiProposedOperation, FieldMap } from "../types";
import { RULE_TYPES } from "../rules";
import { COMPOSE_MODEL, getAnthropic } from "./client";

const RULE_TYPE_IDS = Object.keys(RULE_TYPES);

const SYSTEM_PROMPT = `You are a bulk mapping agent for IntegrateOS, a B2B integration platform.

Task: given a source schema and a target schema, propose a best-effort mapping for every *target* leaf that has a plausible source. Skip target leaves with no plausible source rather than inventing nonsense.

OUTPUT
Call the \`bulk_map\` tool exactly once. Each operation:
- sourceFieldId / targetFieldId: the EXACT ids from the schema node lists (never labels, segs, or hallucinated ids).
- ruleType: "direct" for a plain passthrough; "hardcode" / "currentDate" / "suppress" etc. when the semantics require it. Most loop-to-loop / leaf-to-leaf pairs are "direct".
- value: populate for hardcode / lookup / formula / dateFormat / splitField / concat / parseXml; empty otherwise.
- condition: only populated for "conditional" rules.
- confidence: 0.0–1.0 score. 1.0 = the labels match exactly (e.g. "Shipment ID" → "shipmentIdentificationNumber"). 0.7–0.9 = strong semantic match with some ambiguity. 0.4–0.6 = plausible but uncertain. < 0.4 = probably don't include.
- aiReasoning: one clause (≤ 15 words) explaining the match.

RULES
- Don't remap targets that are already mapped in the existing-mappings list — skip them silently.
- Don't create multiple operations for the same target id.
- Prefer simple, direct passthroughs over complex rules unless the semantics clearly require otherwise.
- For EDI → canonical format pairs, trust that same-name fields (e.g. "city" / "cityName") are a direct match.`;

function buildTool() {
  return {
    name: "bulk_map",
    description:
      "Emit a best-effort mapping for every target leaf that has a plausible source. Call exactly once.",
    input_schema: {
      type: "object" as const,
      properties: {
        operations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceFieldId: { type: "string" },
              targetFieldId: { type: "string" },
              ruleType: { type: "string", enum: RULE_TYPE_IDS },
              value: { type: "string" },
              condition: { type: "string" },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "0–1 confidence that this mapping is correct.",
              },
              aiReasoning: {
                type: "string",
                description: "≤15 words explaining the match.",
              },
            },
            required: [
              "sourceFieldId",
              "targetFieldId",
              "ruleType",
              "confidence",
              "aiReasoning",
            ],
          },
        },
      },
      required: ["operations"],
    },
  };
}

function dumpSchema(descriptor: SchemaDescriptor, label: string): string {
  const lines: string[] = [`── ${label}: ${descriptor.displayName} (${descriptor.format}) ──`];
  for (const n of descriptor.nodes) {
    const indent = "  ".repeat(n.d);
    lines.push(`${indent}${n.id}\t${n.type}\t${n.seg}\t${n.label}`.trimEnd());
  }
  return lines.join("\n");
}

function dumpExistingTargets(maps: FieldMap[]): string {
  const mappedTargets = new Set(maps.filter((m) => m.co === null).map((m) => m.tid));
  if (mappedTargets.size === 0) {
    return "No existing mappings — map every target leaf you can.";
  }
  return `Existing target ids (skip these):\n${Array.from(mappedTargets).join(", ")}`;
}

export interface BulkMapParams {
  sourceDescriptor: SchemaDescriptor;
  targetDescriptor: SchemaDescriptor;
  existingMaps: FieldMap[];
}

export interface BulkMapResponse {
  ok: true;
  operations: AiProposedOperation[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

export async function bulkAutoMap(params: BulkMapParams): Promise<BulkMapResponse> {
  const anthropic = getAnthropic();
  const tool = buildTool();

  const sourceDump = dumpSchema(params.sourceDescriptor, "SOURCE");
  const targetDump = dumpSchema(params.targetDescriptor, "TARGET");
  const existing = dumpExistingTargets(params.existingMaps);

  const result = await anthropic.messages.create({
    model: COMPOSE_MODEL,
    max_tokens: 4096,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `${sourceDump}\n\n${targetDump}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${existing}\n\nMap every target leaf that has a plausible source.`,
      },
    ],
  });

  const toolUseBlock = result.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> =>
      block.type === "tool_use",
  );
  if (!toolUseBlock) {
    throw new Error("Model did not call the bulk_map tool.");
  }

  const input = toolUseBlock.input as {
    operations?: AiProposedOperation[];
  };
  const operations = Array.isArray(input.operations) ? input.operations : [];

  return {
    ok: true,
    operations,
    usage: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      cacheReadInputTokens: result.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: result.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
