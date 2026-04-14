-- Phase 2.2: custom schemas. Users can upload a sample (JSON/XML/CSV/X12)
-- and we infer a SchemaNode tree, persisting it here so MappingSpec rows
-- can reference custom schemas alongside the built-in ones in code.

CREATE TABLE "Schema" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "role" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schema_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Schema_partnerId_idx" ON "Schema"("partnerId");
CREATE INDEX "Schema_format_role_idx" ON "Schema"("format", "role");

-- Partner-scoped schemas cascade with the partner (global schemas have
-- partnerId NULL and survive partner deletion).
ALTER TABLE "Schema"
  ADD CONSTRAINT "Schema_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
