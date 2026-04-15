-- Phase 4.3: exception-queue workflow columns on TransactionRun.
-- Failed runs are unresolved by default; the queue UI surfaces them
-- until a user resolves (with an optional note) or deletes them.

ALTER TABLE "TransactionRun" ADD COLUMN "resolved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TransactionRun" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "TransactionRun" ADD COLUMN "resolvedNote" TEXT;

CREATE INDEX "TransactionRun_status_resolved_idx" ON "TransactionRun"("status", "resolved");

-- Treat existing non-failed runs as implicitly resolved so the queue
-- doesn't flood with successful deliveries if the column was queried
-- with !resolved filter mistakenly.
UPDATE "TransactionRun" SET "resolved" = true WHERE "status" <> 'failed';
