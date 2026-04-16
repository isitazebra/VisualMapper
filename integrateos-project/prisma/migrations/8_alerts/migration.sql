-- Phase 4.5: alert rules + audit log of fired alerts.
-- Rules evaluate after every TransactionRun completes and POST a
-- webhook when their condition is breached within the rolling window.

CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partnerId" TEXT,
    "endpointId" TEXT,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "windowMin" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'webhook',
    "webhookUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertRule_active_idx" ON "AlertRule"("active");
CREATE INDEX "AlertRule_partnerId_idx" ON "AlertRule"("partnerId");
CREATE INDEX "AlertRule_endpointId_idx" ON "AlertRule"("endpointId");

CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertEvent_ruleId_triggeredAt_idx" ON "AlertEvent"("ruleId", "triggeredAt" DESC);

ALTER TABLE "AlertEvent"
  ADD CONSTRAINT "AlertEvent_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
