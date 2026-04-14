/**
 * Seed script — populates the database with a handful of example trading
 * partners so the UI has something to show on first boot.
 *
 * Run with:  npx prisma db seed
 *
 * Idempotent: re-running updates existing partners by name (upsert on name).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXAMPLE_PARTNERS: Array<{
  name: string;
  scac: string | null;
  type: string;
  status: string;
  contactName?: string;
  contactEmail?: string;
}> = [
  {
    name: "AIT Worldwide Logistics",
    scac: "AITL",
    type: "3pl",
    status: "active",
    contactName: "Integration Team",
    contactEmail: "edi@aitworldwide.example",
  },
  {
    name: "UPS SCS",
    scac: "UPSN",
    type: "carrier",
    status: "onboarding",
    contactName: "UPS EDI Desk",
    contactEmail: "edi@ups.example",
  },
  {
    name: "Kroger",
    scac: null,
    type: "customer",
    status: "onboarding",
    contactName: "Kroger B2B",
    contactEmail: "b2b@kroger.example",
  },
  {
    name: "Coyote Logistics",
    scac: "CLLQ",
    type: "carrier",
    status: "active",
    contactName: "Coyote EDI",
    contactEmail: "edi@coyote.example",
  },
];

async function main() {
  console.log("Seeding partners...");
  for (const partner of EXAMPLE_PARTNERS) {
    // Prisma has no unique constraint on name in the current schema, so we
    // use findFirst + upsert-by-id instead of unique upsert.
    const existing = await prisma.partner.findFirst({ where: { name: partner.name } });
    if (existing) {
      await prisma.partner.update({
        where: { id: existing.id },
        data: partner,
      });
      console.log(`  ↻ updated ${partner.name}`);
    } else {
      await prisma.partner.create({ data: partner });
      console.log(`  ✓ created ${partner.name}`);
    }
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
