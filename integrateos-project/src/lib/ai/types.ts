import type { RuleTypeId } from "../types";

/** One proposed override from the AI compose flow. */
export interface ProposedOverride {
  customerName: string;
  ruleType: RuleTypeId;
  value?: string;
  condition?: string;
  notes?: string;
}

/** One proposed mapping operation — create or replace a base mapping
 * for (sourceFieldId, targetFieldId), optionally with overrides. */
export interface ProposedOperation {
  sourceFieldId: string;
  targetFieldId: string;
  ruleType: RuleTypeId;
  value?: string;
  condition?: string;
  notes?: string;
  overrides?: ProposedOverride[];
}

/** Full compose response sent back to the client. */
export interface ComposeResponse {
  ok: true;
  operations: ProposedOperation[];
  reasoning: string;
  /** Echo of what the user asked — useful for history / undo. */
  userPrompt: string;
  /** Usage metrics from the LLM, surfaced for observability. */
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

export interface ComposeError {
  ok: false;
  error: string;
}
