/**
 * Named transformation formulas. Looked up by rule.value for
 * ruleType === "formula". Unknown names fall through to a "⟨formula?⟩"
 * placeholder (same as before).
 *
 * Coverage is intentionally narrow — the ones we saw most often in the
 * reference DMAs (cents↔dollars, country code conversion, UOM). More
 * can land in follow-up commits without schema or API changes.
 */

const COUNTRY_2TO3: Record<string, string> = {
  US: "USA", CA: "CAN", MX: "MEX", GB: "GBR", FR: "FRA", DE: "DEU", NL: "NLD",
  BE: "BEL", IT: "ITA", ES: "ESP", PT: "PRT", CH: "CHE", AT: "AUT", PL: "POL",
  SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", IE: "IRL", CZ: "CZE", HU: "HUN",
  JP: "JPN", KR: "KOR", CN: "CHN", IN: "IND", AU: "AUS", NZ: "NZL", BR: "BRA",
  AR: "ARG", CL: "CHL", CO: "COL", PE: "PER", ZA: "ZAF", EG: "EGY", SG: "SGP",
  MY: "MYS", TH: "THA", VN: "VNM", ID: "IDN", PH: "PHL", AE: "ARE", SA: "SAU",
  TR: "TUR", IL: "ISR", RU: "RUS", UA: "UKR",
};
const COUNTRY_3TO2: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_2TO3).map(([k, v]) => [v, k]),
);

const UOM_TO_EACHES: Record<string, number> = {
  EA: 1, EACH: 1,
  CA: 12, CASE: 12, CS: 12,
  PL: 48, PALLET: 48, PLT: 48,
  BX: 24, BOX: 24,
};

/** All formula implementations. Each takes the source value (as string)
 * and returns the transformed value. */
export const FORMULAS: Record<string, (value: string) => string> = {
  // ─── Numeric scaling ──────────────────────────────────────────────
  cents_to_dollars: (v) => {
    const n = parseInt(stripThousands(v), 10);
    if (Number.isNaN(n)) return v;
    return (n / 100).toFixed(2);
  },
  dollars_to_cents: (v) => {
    const n = parseFloat(stripThousands(v));
    if (Number.isNaN(n)) return v;
    return String(Math.round(n * 100));
  },

  // ─── String normalization ─────────────────────────────────────────
  to_upper: (v) => v.toUpperCase(),
  to_lower: (v) => v.toLowerCase(),
  trim: (v) => v.trim(),
  digits_only: (v) => v.replace(/\D/g, ""),
  strip_leading_zeros: (v) => v.replace(/^0+/, "") || (v.length > 0 ? "0" : ""),
  first_word: (v) => (v.trim().split(/\s+/)[0] ?? ""),
  last_word: (v) => {
    const parts = v.trim().split(/\s+/);
    return parts[parts.length - 1] ?? "";
  },
  title_case: (v) =>
    v
      .toLowerCase()
      .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase()),

  // ─── Country code conversion ──────────────────────────────────────
  country_2to3: (v) => COUNTRY_2TO3[v.trim().toUpperCase()] ?? v,
  country_3to2: (v) => COUNTRY_3TO2[v.trim().toUpperCase()] ?? v,

  // ─── Unit-of-measure conversion ───────────────────────────────────
  lb_to_kg: (v) => {
    const n = parseFloat(stripThousands(v));
    if (Number.isNaN(n)) return v;
    return (n * 0.45359237).toFixed(2);
  },
  kg_to_lb: (v) => {
    const n = parseFloat(stripThousands(v));
    if (Number.isNaN(n)) return v;
    return (n / 0.45359237).toFixed(2);
  },
  in_to_cm: (v) => {
    const n = parseFloat(stripThousands(v));
    if (Number.isNaN(n)) return v;
    return (n * 2.54).toFixed(2);
  },
  cm_to_in: (v) => {
    const n = parseFloat(stripThousands(v));
    if (Number.isNaN(n)) return v;
    return (n / 2.54).toFixed(2);
  },
  to_each_count: (v) => {
    // Input like "5 CA" or "5" — output the each count.
    const match = v.trim().match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)?$/);
    if (!match) return v;
    const qty = parseFloat(match[1]);
    const uom = (match[2] ?? "EA").toUpperCase();
    const multiplier = UOM_TO_EACHES[uom] ?? 1;
    return String(Math.round(qty * multiplier));
  },
};

function stripThousands(v: string): string {
  // Strip comma thousand-separators without disturbing decimal points.
  return v.replace(/(?<=\d),(?=\d{3}(\D|$))/g, "");
}

export const FORMULA_NAMES = Object.keys(FORMULAS);
