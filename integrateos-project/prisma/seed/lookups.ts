/**
 * Seed the global lookup tables used by the showcase 856 → Blue Yonder
 * mapping. Idempotent — upserts by name (global scope, partnerId=null).
 */
import type { PrismaClient } from "@prisma/client";

interface SeedLookup {
  name: string;
  description: string;
  entries: Record<string, string>;
}

const LOOKUPS: SeedLookup[] = [
  {
    name: "X12_SHIPMENT_STATUS",
    description:
      "X12 856 BSN*01 purpose codes → canonical shipment status. Used in the " +
      "Blue Yonder ASN mapping to translate '00' (original) / '05' (replace) / " +
      "'06' (cancellation) into a human-readable status enum.",
    entries: {
      "00": "SHIPPED",
      "05": "REPLACED",
      "06": "CANCELLED",
      "07": "DUPLICATE",
    },
  },
  {
    name: "X12_TRANSPORT_MODE",
    description: "TD5*04 transportation method codes → readable mode labels.",
    entries: {
      M: "Motor (Truck)",
      R: "Rail",
      A: "Air",
      S: "Ocean",
      U: "Mail",
      LT: "LTL",
      CT: "Containerized",
      H: "Parcel",
    },
  },
  {
    name: "UOM_CODE",
    description:
      "X12 unit-of-measure code → human UOM name. Covers the common ASN codes.",
    entries: {
      EA: "Each",
      CA: "Case",
      CS: "Case",
      PL: "Pallet",
      PLT: "Pallet",
      BX: "Box",
      KG: "Kilogram",
      LB: "Pound",
      OZ: "Ounce",
      GM: "Gram",
    },
  },
  {
    name: "ISO_COUNTRY_3",
    description:
      "2-letter ISO alpha-2 country codes → 3-letter ISO alpha-3. Used when " +
      "the source carries US-style 2-letter codes but the target expects " +
      "ISO-3 (Blue Yonder's default). The built-in `country_2to3` formula " +
      "covers the common list; this lookup exists as a customer override " +
      "for partners that use non-standard codes.",
    entries: {
      US: "USA",
      CA: "CAN",
      MX: "MEX",
      GB: "GBR",
      DE: "DEU",
      FR: "FRA",
      NL: "NLD",
      JP: "JPN",
      CN: "CHN",
    },
  },
];

export async function seedLookups(prisma: PrismaClient): Promise<void> {
  for (const l of LOOKUPS) {
    const existing = await prisma.lookupTable.findFirst({
      where: { name: l.name, partnerId: null },
    });
    if (existing) {
      await prisma.lookupTable.update({
        where: { id: existing.id },
        data: {
          description: l.description,
          entries: l.entries,
        },
      });
      console.log(`  ↻ ${l.name} (${Object.keys(l.entries).length} entries)`);
    } else {
      await prisma.lookupTable.create({
        data: {
          name: l.name,
          description: l.description,
          partnerId: null,
          entries: l.entries,
        },
      });
      console.log(`  ✓ ${l.name} (${Object.keys(l.entries).length} entries)`);
    }
  }
}
