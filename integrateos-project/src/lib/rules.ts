import type { RuleTypeId, RuleTypeMeta } from "./types";

/**
 * Centralized font stacks. Fonts are loaded via <link> in app/layout.tsx
 * — if we switch to next/font/google later, update these two constants
 * to reference the injected CSS variables.
 */
export const FONT_SANS = "'Karla', ui-sans-serif, system-ui, sans-serif";
export const FONT_MONO = "'Fira Code', ui-monospace, monospace";

/** Palette used across the mapping UI (kept in sync with tailwind.config). */
export const COLORS = {
  bg: "#f3f1ec",
  paper: "#faf8f5",
  white: "#fff",
  cream: "#edeae3",
  border: "#dbd6cb",
  bHard: "#c2bdb0",
  tx: "#1b1914",
  t2: "#5a554b",
  t3: "#999189",
  blue: "#1d4ed8",
  blueSoft: "#eef2ff",
  green: "#15803d",
  greenSoft: "#f0fdf4",
  greenBorder: "#86efac",
  amber: "#a16207",
  amberSoft: "#fefce8",
  red: "#be123c",
  purple: "#7c3aed",
  purpleSoft: "#f5f3ff",
  teal: "#0f766e",
  orange: "#c2410c",
  orangeSoft: "#fff7ed",
  pink: "#be185d",
  indigo: "#6366f1",
};

/** The 15 rule types supported by the mapper. */
export const RULE_TYPES: Record<RuleTypeId, RuleTypeMeta> = {
  direct:        { label: "Direct Map",     icon: "→",  color: COLORS.blue },
  hardcode:      { label: "Hardcode",       icon: "✎",  color: COLORS.purple },
  conditional:   { label: "Conditional",    icon: "⚡",  color: COLORS.orange },
  suppress:      { label: "Do Not Send",    icon: "⊘",  color: COLORS.red },
  currentDate:   { label: "Current Date",   icon: "📅", color: COLORS.teal },
  currentTime:   { label: "Current Time",   icon: "⏰", color: COLORS.teal },
  autoIncrement: { label: "Auto Increment", icon: "#",  color: COLORS.amber },
  concat:        { label: "Concatenate",    icon: "&",  color: COLORS.pink },
  lookup:        { label: "Lookup/Convert", icon: "📋", color: COLORS.green },
  formula:       { label: "Transform",      icon: "ƒ",  color: COLORS.blue },
  parseXml:      { label: "Parse XML Tag",  icon: "🔍", color: COLORS.indigo },
  dateFormat:    { label: "Date Convert",   icon: "🔄", color: COLORS.teal },
  passthrough:   { label: "Passthrough",    icon: "⇢",  color: COLORS.green },
  hlCounter:     { label: "HL Counter",     icon: "⇅",  color: COLORS.amber },
  splitField:    { label: "Split/Substr",   icon: "✂",  color: COLORS.pink },
};

/** Rule types that don't require a value input. */
export const VALUELESS_RULES: RuleTypeId[] = [
  "direct",
  "suppress",
  "currentDate",
  "currentTime",
  "passthrough",
];

export function ruleNeedsValue(rt: RuleTypeId): boolean {
  return !VALUELESS_RULES.includes(rt);
}
