-- Phase 2.3: persist a sample payload per MappingSpec so the studio's
-- live preview reloads across page refreshes. Free-form text — the
-- format matches the spec's source schema.

ALTER TABLE "MappingSpec" ADD COLUMN "samplePayload" TEXT;
