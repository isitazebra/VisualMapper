-- Phase 2.5c: lookup tables for the `lookup` rule type. Partner-scoped
-- or global (partnerId IS NULL). Entries is a JSONB object of string
-- keys to string values.

CREATE TABLE "LookupTable" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entries" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookupTable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LookupTable_partnerId_idx" ON "LookupTable"("partnerId");
CREATE INDEX "LookupTable_name_idx" ON "LookupTable"("name");

ALTER TABLE "LookupTable"
  ADD CONSTRAINT "LookupTable_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
