/**
 * Seed entry-point. Populates the database with:
 *   1. A handful of example trading partners (Coyote, Kroger, UPS SCS, etc.)
 *   2. Four realistic mapping specs (Coyote 204/214/210 → XML,
 *      BlueYonder 856 → JSON) with:
 *        - base field mappings and per-mapping notes
 *        - customer-specific overrides drawn from the real DMAs
 *        - source-side sample payloads so the studio's live preview
 *          has something to render immediately
 *
 * Run with:   npx prisma db seed
 *
 * Fully idempotent: re-runs update partners in place and wipe+re-seed
 * the field mappings inside each seeded spec. Any user-created specs or
 * partners are untouched (we match on the "[seed:…]" name suffix).
 */
import { PrismaClient } from "@prisma/client";
import { seedPartners } from "./seed/partners";
import { seedCoyoteMappings } from "./seed/mappings-coyote";
import { seedBlueYonderMappings } from "./seed/mappings-blueyonder";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding partners…");
  const partners = await seedPartners(prisma);

  const coyoteId = partners.get("coyote");
  if (coyoteId) {
    console.log("\nSeeding Coyote mappings…");
    await seedCoyoteMappings(prisma, coyoteId);
  }

  const blueYonderId = partners.get("blueyonder");
  if (blueYonderId) {
    console.log("\nSeeding Blue Yonder mappings…");
    await seedBlueYonderMappings(prisma, blueYonderId);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
