-- Phase 2.1: introduce Schema registry ids on MappingSpec so specs can
-- reference arbitrary schemas (built-in or custom) instead of only an
-- X12 tx type + target format. Existing rows are backfilled from their
-- legacy (txType, targetFormat) columns.

-- Add the columns (nullable for the transition — Phase 2.2 will lock
-- them down once the Schema table is introduced).
ALTER TABLE "MappingSpec" ADD COLUMN "sourceSchemaId" TEXT;
ALTER TABLE "MappingSpec" ADD COLUMN "targetSchemaId" TEXT;

-- Backfill existing rows. Source is always X12 built-in for legacy rows.
UPDATE "MappingSpec"
SET "sourceSchemaId" = 'x12:' || "txType"
WHERE "sourceSchemaId" IS NULL;

-- Target depends on format: XML is per-tx, everyone else is a single default.
UPDATE "MappingSpec"
SET "targetSchemaId" = CASE
  WHEN "targetFormat" = 'xml' THEN 'xml:' || "txType"
  WHEN "targetFormat" = 'json' THEN 'json:default'
  WHEN "targetFormat" = 'otm_xml' THEN 'otm_xml:default'
  WHEN "targetFormat" = 'csv' THEN 'csv:default'
  ELSE 'json:default'
END
WHERE "targetSchemaId" IS NULL;

-- Indexes for future joins against the Schema table.
CREATE INDEX "MappingSpec_sourceSchemaId_idx" ON "MappingSpec"("sourceSchemaId");
CREATE INDEX "MappingSpec_targetSchemaId_idx" ON "MappingSpec"("targetSchemaId");
