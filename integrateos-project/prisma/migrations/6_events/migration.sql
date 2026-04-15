-- Phase 4.1: per-lifecycle-stage event audit trail for TransactionRun.
-- Each run now accumulates rows: received → parsed → transformed →
-- (egress_sent → egress_response) → delivered/failed. Renders as a
-- timeline on the run detail page.

CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsedMs" INTEGER,
    "message" TEXT,
    "detail" JSONB,

    CONSTRAINT "TransactionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransactionEvent_runId_at_idx" ON "TransactionEvent"("runId", "at");

ALTER TABLE "TransactionEvent"
  ADD CONSTRAINT "TransactionEvent_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "TransactionRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
