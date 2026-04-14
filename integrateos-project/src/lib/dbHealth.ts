import { prisma } from "./db";

/**
 * Attempts a cheap query against the database. Returns null on success,
 * or a short human-readable error message on failure. Used by server
 * components to show a "set up Neon" CTA instead of crashing when
 * DATABASE_URL is missing or the DB is unreachable (e.g. first deploy
 * before the integration is installed).
 */
export async function checkDb(): Promise<string | null> {
  if (!process.env.DATABASE_URL) {
    return "DATABASE_URL is not set. Install the Neon integration in Vercel to provision a database.";
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Database unreachable: ${msg}`;
  }
}
