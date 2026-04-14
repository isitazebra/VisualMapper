// Shared types for the mapping UI and domain model.

export type NodeType = "group" | "loop" | "el";

export interface SchemaNode {
  /** Stable id used in maps and collapse state. */
  id: string;
  /** Segment tag/path like "B2*04" or "standardCarrierAlphaCode". */
  seg: string;
  /** Human-readable label / description. */
  label: string;
  /** Depth/indent level in the tree. */
  d: number;
  type: NodeType;
  /** Child node ids (for groups/loops). */
  kids?: string[];
  /** Optional sample value displayed next to source leaves. */
  sample?: string;
  /** Optional max repeat count for loops. */
  max?: string;
}

export type RuleTypeId =
  | "direct"
  | "hardcode"
  | "conditional"
  | "suppress"
  | "currentDate"
  | "currentTime"
  | "autoIncrement"
  | "concat"
  | "lookup"
  | "formula"
  | "parseXml"
  | "dateFormat"
  | "passthrough"
  | "hlCounter"
  | "splitField";

export interface RuleTypeMeta {
  /** Label shown in the dropdown. */
  label: string;
  /** Icon glyph. */
  icon: string;
  /** Accent color. */
  color: string;
}

export interface FieldMap {
  id: string;
  /** Source node id. */
  sid: string;
  /** Target node id. */
  tid: string;
  /** Rule type applied. */
  rt: RuleTypeId;
  /** Value for the rule (hardcode, formula, etc.). */
  v: string;
  /** Customer override owner — null means this is the base rule. */
  co: string | null;
  /** Condition for conditional rules or overrides. */
  cond: string;
  /** Confirmed / reviewed flag. */
  ok: boolean;
  /** Free-form notes. */
  note: string;
}

export type TxType = "204" | "990" | "214" | "210" | "850" | "855" | "856" | "810";
export type EdiVersion = "3040" | "4010" | "4030" | "5010";
export type TargetFormat = "xml" | "json" | "otm_xml" | "csv";

export interface MapperState {
  maps: FieldMap[];
  collapsed: Record<string, boolean>;
  selSrc: string | null;
  selMap: string | null;
  cust: string;
  loopOps: Record<string, string>;
  tx: TxType;
  ver: EdiVersion;
  fmt: TargetFormat;
  view: "mapping" | "overrides" | "changelog";
}

/** One operation produced by the AI compose / auto-map flows. Kept in
 * this file so the reducer can dispatch on it without importing from
 * the ai lib (which pulls in the SDK). */
export interface AiProposedOperation {
  sourceFieldId: string;
  targetFieldId: string;
  ruleType: RuleTypeId;
  value?: string;
  condition?: string;
  notes?: string;
  overrides?: Array<{
    customerName: string;
    ruleType: RuleTypeId;
    value?: string;
    condition?: string;
    notes?: string;
  }>;
  /** Bulk auto-map only — 0 to 1 model confidence. */
  confidence?: number;
  /** Bulk auto-map only — short per-op reasoning. */
  aiReasoning?: string;
}

export type MapperAction =
  | { type: "TOG"; id: string }
  | { type: "SEL_SRC"; id: string }
  | { type: "MAP"; tid: string }
  | { type: "SELM"; id: string }
  | { type: "DEL"; id: string }
  | { type: "UPD"; id: string; u: Partial<FieldMap> }
  | { type: "OVR"; bid: string; c: string; r?: RuleTypeId }
  | { type: "CUST"; v: string }
  | { type: "TX"; v: TxType }
  | { type: "VER"; v: EdiVersion }
  | { type: "FMT"; v: TargetFormat }
  | { type: "VIEW"; v: MapperState["view"] }
  | { type: "AUTO" }
  /** Apply a batch of AI-proposed operations atomically. Replaces any
   * existing base/override at the same (sid, tid[, co]) key. */
  | { type: "APPLY_OPS"; ops: AiProposedOperation[] };
