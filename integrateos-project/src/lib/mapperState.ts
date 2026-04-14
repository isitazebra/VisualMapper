import type { FieldMap, MapperAction, MapperState, SchemaNode } from "./types";
import type { HydratedMappingSpec } from "./mappingSpec";
import { getSourceSchema, getTargetSchema } from "./schemas";

export const initialMapperState: MapperState = {
  maps: [],
  collapsed: {},
  selSrc: null,
  selMap: null,
  cust: "(Base)",
  loopOps: {},
  tx: "204",
  ver: "4010",
  fmt: "xml",
  view: "mapping",
};

/** Build reducer state from a hydrated server-side spec. */
export function stateFromSpec(spec: HydratedMappingSpec): MapperState {
  return {
    ...initialMapperState,
    tx: spec.txType,
    ver: spec.ediVersion,
    fmt: spec.targetFormat,
    maps: spec.maps,
  };
}

/** Split a label into fuzzy-match tokens (words ≥ 3 chars). */
function tokenize(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[\s_/\-()#*]+/)
    .filter((w) => w.length > 2);
}

/** Returns a set of newly-auto-mapped FieldMaps (fuzzy label match). */
function autoMap(state: MapperState): FieldMap[] {
  const src = getSourceSchema(state.tx);
  const tgt = getTargetSchema(state.tx, state.fmt);
  const used = new Set(state.maps.map((m) => m.tid));
  const added: FieldMap[] = [];

  src
    .filter((n) => n.type === "el")
    .forEach((sf) => {
      const sw = tokenize(sf.label);
      let best: SchemaNode | null = null;
      let bestScore = 0;
      tgt
        .filter((n) => n.type === "el")
        .forEach((tf) => {
          if (used.has(tf.id)) return;
          const tw = tokenize(tf.label);
          let hits = 0;
          sw.forEach((w) => {
            if (tw.some((t) => t.includes(w) || w.includes(t))) hits++;
          });
          const score = hits / Math.max(sw.length, tw.length, 1);
          if (score > bestScore && score >= 0.3) {
            best = tf;
            bestScore = score;
          }
        });
      if (best) {
        const tgtNode = best as SchemaNode;
        used.add(tgtNode.id);
        added.push({
          id: `m${Date.now()}_${sf.id}`,
          sid: sf.id,
          tid: tgtNode.id,
          rt: "direct",
          v: "",
          co: null,
          cond: "",
          ok: false,
          note: "",
        });
      }
    });

  return added;
}

export function mapperReducer(state: MapperState, action: MapperAction): MapperState {
  switch (action.type) {
    case "TOG":
      return { ...state, collapsed: { ...state.collapsed, [action.id]: !state.collapsed[action.id] } };

    case "SEL_SRC":
      return { ...state, selSrc: state.selSrc === action.id ? null : action.id };

    case "MAP": {
      if (!state.selSrc) return state;
      // Don't create a duplicate base mapping for the same target.
      if (state.maps.find((m) => m.tid === action.tid && !m.co)) return state;
      const newMap: FieldMap = {
        id: `m${Date.now()}`,
        sid: state.selSrc,
        tid: action.tid,
        rt: "direct",
        v: "",
        co: null,
        cond: "",
        ok: false,
        note: "",
      };
      return { ...state, maps: [...state.maps, newMap], selSrc: null, selMap: newMap.id };
    }

    case "SELM":
      return { ...state, selMap: action.id };

    case "DEL":
      return {
        ...state,
        maps: state.maps.filter((m) => m.id !== action.id),
        selMap: state.selMap === action.id ? null : state.selMap,
      };

    case "UPD":
      return {
        ...state,
        maps: state.maps.map((m) => (m.id === action.id ? { ...m, ...action.u } : m)),
      };

    case "OVR": {
      const base = state.maps.find((m) => m.id === action.bid);
      if (!base) return state;
      const override: FieldMap = {
        ...base,
        id: `m${Date.now()}`,
        co: action.c,
        rt: action.r ?? "hardcode",
        v: "",
        cond: "",
        ok: false,
      };
      return { ...state, maps: [...state.maps, override], selMap: override.id };
    }

    case "CUST":
      return { ...state, cust: action.v };

    case "TX":
      // Changing the tx type invalidates all mappings.
      return { ...state, tx: action.v, maps: [], collapsed: {}, selSrc: null, selMap: null };

    case "VER":
      return { ...state, ver: action.v };

    case "FMT":
      return { ...state, fmt: action.v, maps: [], collapsed: {}, selSrc: null, selMap: null };

    case "VIEW":
      return { ...state, view: action.v };

    case "AUTO":
      return { ...state, maps: [...state.maps, ...autoMap(state)] };

    default:
      return state;
  }
}

/**
 * A node is visible iff none of its collapsed ancestors hide it.
 * Three-level ancestor walk is sufficient for the shapes we render.
 */
export function isVisible(node: SchemaNode, tree: SchemaNode[], collapsed: Record<string, boolean>): boolean {
  for (const parent of tree) {
    if (parent.kids?.includes(node.id) && collapsed[parent.id]) return false;
    if (parent.kids) {
      for (const childId of parent.kids) {
        const child = tree.find((x) => x.id === childId);
        if (child?.kids?.includes(node.id) && collapsed[child.id]) return false;
        if (child?.kids) {
          for (const grandId of child.kids) {
            const grand = tree.find((x) => x.id === grandId);
            if (grand?.kids?.includes(node.id) && collapsed[grand.id]) return false;
          }
        }
      }
    }
  }
  return true;
}
