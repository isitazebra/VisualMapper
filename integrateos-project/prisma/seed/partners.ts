/** Example partners seeded on first boot — stable identifiers so the
 * mapping seeders can reference them reliably on reruns. */
import type { PrismaClient } from "@prisma/client";

export interface SeededPartner {
  slug: string;
  id: string;
}

const PARTNERS = [
  {
    slug: "ait",
    name: "AIT Worldwide Logistics",
    scac: "AITL",
    type: "3pl",
    status: "active",
    contactName: "Integration Team",
    contactEmail: "edi@aitworldwide.example",
  },
  {
    slug: "ups-scs",
    name: "UPS SCS",
    scac: "UPSN",
    type: "carrier",
    status: "onboarding",
    contactName: "UPS EDI Desk",
    contactEmail: "edi@ups.example",
  },
  {
    slug: "kroger",
    name: "Kroger",
    scac: null as string | null,
    type: "customer",
    status: "onboarding",
    contactName: "Kroger B2B",
    contactEmail: "b2b@kroger.example",
  },
  {
    slug: "coyote",
    name: "Coyote Logistics",
    scac: "CLLQ",
    type: "carrier",
    status: "active",
    contactName: "Coyote EDI",
    contactEmail: "edi@coyote.example",
  },
  {
    slug: "blueyonder",
    name: "Blue Yonder WMS",
    scac: null,
    type: "3pl",
    status: "active",
    contactName: "Blue Yonder Integrations",
    contactEmail: "integrations@blueyonder.example",
  },
];

/**
 * Upserts the example partners and returns a slug → id lookup the
 * mapping seeders use. Idempotent on name: re-running updates in place.
 */
export async function seedPartners(prisma: PrismaClient): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();
  for (const p of PARTNERS) {
    const existing = await prisma.partner.findFirst({ where: { name: p.name } });
    const saved = existing
      ? await prisma.partner.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            scac: p.scac,
            type: p.type,
            status: p.status,
            contactName: p.contactName,
            contactEmail: p.contactEmail,
          },
        })
      : await prisma.partner.create({
          data: {
            name: p.name,
            scac: p.scac,
            type: p.type,
            status: p.status,
            contactName: p.contactName,
            contactEmail: p.contactEmail,
          },
        });
    bySlug.set(p.slug, saved.id);
    console.log(`  ${existing ? "↻" : "✓"} ${p.name}`);
  }
  return bySlug;
}
