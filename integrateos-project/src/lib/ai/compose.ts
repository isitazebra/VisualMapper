/**
 * Plain-English → structured mapping operations via Anthropic tool use.
 *
 * The caller provides the user's sentence plus the full context: source
 * schema, target schema, known customers, and the current set of rules.
 * We send that to Claude with a `propose_mappings` tool. Claude reads
 * the schemas and emits one or more structured operations we hand back
 * to the client for preview.
 *
 * Prompt caching is turned on for the system prompt + schema context so
 * subsequent calls within the same mapping session are cheap.
 */
import type { SchemaDescriptor } from "../schemas/registry";
import type { FieldMap } from "../types";
import { RULE_TYPES } from "../rules";
import { COMPOSE_MODEL, getAnthropic } from "./client";
import type {
  ComposeResponse,
  ProposedOperation,
} from "./types";

const RULE_TYPE_IDS = Object.keys(RULE_TYPES);

const SYSTEM_PROMPT = `You are a mapping rule compiler for IntegrateOS, a B2B integration platform that maps EDI / XML / JSON / CSV payloads across trading partners.

Your job: read the user's plain-English description of a data mapping and emit structured operations by calling the \`propose_mappings\` tool exactly once.

RULES
- Match fields by meaning, not by exact string. Users will say "shipment ID" or "B2*04" — find the best matching id from the schema node lists provided.
- Always return node IDs (e.g. "b204", "tx06") — never segs, labels, or free text, in the sourceFieldId / targetFieldId fields.
- "For {customer}, …" or "When {customer}, …" phrasing maps to an override, not a change to the base rule.
- If the user describes a conditional ("if ISA*06 = ELOGEX then …"), use ruleType="conditional" with the full predicate in the \`condition\` field and the value in \`value\`.
- Never invent node IDs — if you can't confidently match a field, add a short note explaining the ambiguity and skip that operation rather than guessing.
- \`notes\` should be empty unless the user's sentence contains genuinely useful context beyond the rule itself. Don't restate what the rule already does.
- Prefer the simplest rule type that expresses the intent: direct over passthrough, hardcode over conditional when the condition is always true, etc.
- The \`reasoning\` field should be one or two short sentences explaining what you did and, if applicable, any ambiguities.

RULE-VALUE SYNTAX — the transform engine understands these specific formats:
- \`dateFormat\`: value is "FROM->TO", with tokens YYYY YY MM DD HH mm ss (e.g. "YYYYMMDD->ISO", "YYMMDD->MM/DD/YYYY"). The literal "ISO" on the right-hand side is a shortcut for ISO 8601.
- \`formula\`: value is one of: cents_to_dollars, dollars_to_cents, to_upper, to_lower, trim, digits_only, strip_leading_zeros, first_word, last_word, title_case, country_2to3 (US→USA), country_3to2 (USA→US), lb_to_kg, kg_to_lb, in_to_cm, cm_to_in, to_each_count (e.g. "5 CA" → "60"). Use \`formula\` for any numeric or string transformation before falling back to a placeholder.
- \`concat\`: value is either a plain literal (appended as a suffix) or a template with {id} or {SEG} placeholders referencing other source node ids. {_} refers to this rule's own source. Example: "{_}-{g06}" → source + "-" + GS control number.
- \`splitField\`: value is "start,end" with optional negative indexes (e.g. "0,3" or "-4" or "2,-1").
- \`parseXml\`: value is a tag path (e.g. "Shipment/Origin/City" or "Shipment/@id" for attributes).
- \`lookup\`: value names a lookup table (user-managed key→value table). The source value is the key.
- \`aggregate\`: value is one of: sum, count, avg, min, max, first, last. The rule's source should be a leaf inside a loop; the op runs across all iterations of that loop.
- \`conditional\`: \`condition\` is a boolean expression like "ISA*06 = ELOGEX" or "N1*01 = BT AND N4*02 = CA". Operators: = / !=. Conjunctions: AND / OR (left-to-right). Literals can be unquoted or quoted. "_" means this rule's own source. When true, \`value\` is emitted; when false, the source value passes through unchanged.`;

/** Tool schema given to Claude. Mirrors ProposedOperation / ProposedOverride. */
function buildTool() {
  return {
    name: "propose_mappings",
    description:
      "Propose one or more mapping operations based on the user's plain-English description. Call this tool exactly once per response.",
    input_schema: {
      type: "object" as const,
      properties: {
        operations: {
          type: "array",
          description:
            "One or more mapping operations. Each operation creates or replaces a base mapping for the (sourceFieldId, targetFieldId) pair, optionally with customer overrides.",
          items: {
            type: "object",
            properties: {
              sourceFieldId: {
                type: "string",
                description: "Source schema node id (from the `id` field in the source schema list).",
              },
              targetFieldId: {
                type: "string",
                description: "Target schema node id.",
              },
              ruleType: {
                type: "string",
                enum: RULE_TYPE_IDS,
                description:
                  "The rule type. Use 'direct' for a plain passthrough, 'hardcode' for a literal value, 'conditional' for if/then logic.",
              },
              value: {
                type: "string",
                description:
                  "The rule value — literal for hardcode, format spec for dateFormat, table name for lookup, substring spec for splitField, etc. Empty for direct/passthrough/suppress/currentDate/currentTime.",
              },
              condition: {
                type: "string",
                description:
                  "Condition predicate for conditional rules (e.g. 'ISA*06 = ELOGEX'). Leave empty when not applicable.",
              },
              notes: {
                type: "string",
                description:
                  "Free-form note captured from the user's sentence, if any. Empty otherwise.",
              },
              overrides: {
                type: "array",
                description:
                  "Zero or more customer-specific overrides for this mapping.",
                items: {
                  type: "object",
                  properties: {
                    customerName: {
                      type: "string",
                      description: "One of the customer names from the provided list.",
                    },
                    ruleType: { type: "string", enum: RULE_TYPE_IDS },
                    value: { type: "string" },
                    condition: { type: "string" },
                    notes: { type: "string" },
                  },
                  required: ["customerName", "ruleType"],
                },
              },
            },
            required: ["sourceFieldId", "targetFieldId", "ruleType"],
          },
        },
        reasoning: {
          type: "string",
          description:
            "One or two sentences explaining what you did and flagging any ambiguity.",
        },
      },
      required: ["operations", "reasoning"],
    },
  };
}

/** Produce a compact schema dump suitable for the cached system prompt.
 * We include id, seg, label, type, and depth — no sample values. */
function dumpSchema(descriptor: SchemaDescriptor, label: string): string {
  const lines: string[] = [`── ${label}: ${descriptor.displayName} (${descriptor.format}) ──`];
  for (const n of descriptor.nodes) {
    const indent = "  ".repeat(n.d);
    lines.push(
      `${indent}${n.id}\t${n.type}\t${n.seg}\t${n.label}`.trimEnd(),
    );
  }
  return lines.join("\n");
}

/** Compact render of the existing maps so Claude knows what's there. */
function dumpExistingMaps(maps: FieldMap[]): string {
  if (maps.length === 0) return "No existing mappings yet.";
  const lines: string[] = [
    "Existing mappings (sid → tid, ruleType[, co] [value]):",
  ];
  for (const m of maps) {
    lines.push(
      `- ${m.sid} → ${m.tid}  ${m.rt}${m.co ? ` [override:${m.co}]` : ""}${
        m.v ? ` "${m.v}"` : ""
      }${m.cond ? ` when ${m.cond}` : ""}`,
    );
  }
  return lines.join("\n");
}

export interface ComposeParams {
  userPrompt: string;
  sourceDescriptor: SchemaDescriptor;
  targetDescriptor: SchemaDescriptor;
  existingMaps: FieldMap[];
  customers: string[];
}

export async function proposeMappings(params: ComposeParams): Promise<ComposeResponse> {
  const anthropic = getAnthropic();
  const tool = buildTool();

  const sourceDump = dumpSchema(params.sourceDescriptor, "SOURCE");
  const targetDump = dumpSchema(params.targetDescriptor, "TARGET");
  const customersList = `Known customers: ${params.customers.join(", ")}`;
  const existing = dumpExistingMaps(params.existingMaps);

  // System blocks: prompt (cached, permanent) + schema context (cached per mapping).
  // User message contains the mutable parts (existing maps + the prompt).
  const result = await anthropic.messages.create({
    model: COMPOSE_MODEL,
    max_tokens: 1024,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `${sourceDump}\n\n${targetDump}\n\n${customersList}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${existing}\n\nUser request: ${params.userPrompt}`,
      },
    ],
  });

  // Find the tool_use block.
  const toolUseBlock = result.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> =>
      block.type === "tool_use",
  );
  if (!toolUseBlock) {
    throw new Error("Model did not call the propose_mappings tool.");
  }

  const input = toolUseBlock.input as {
    operations?: ProposedOperation[];
    reasoning?: string;
  };

  return {
    ok: true,
    operations: Array.isArray(input.operations) ? input.operations : [],
    reasoning: typeof input.reasoning === "string" ? input.reasoning : "",
    userPrompt: params.userPrompt,
    usage: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      cacheReadInputTokens: result.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: result.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
