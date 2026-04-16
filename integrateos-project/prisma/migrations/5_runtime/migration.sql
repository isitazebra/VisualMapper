-- Phase 4.0: runtime execution engine. Endpoints bind an opaque token
-- to a mapping spec; TransactionRun captures every inbound request's
-- lifecycle end-to-end.

CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'sync',
    "egressUrl" TEXT,
    "egressHeaders" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Endpoint_token_key" ON "Endpoint"("token");
CREATE INDEX "Endpoint_partnerId_idx" ON "Endpoint"("partnerId");
CREATE INDEX "Endpoint_mappingSpecId_idx" ON "Endpoint"("mappingSpecId");

ALTER TABLE "Endpoint"
  ADD CONSTRAINT "Endpoint_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Endpoint"
  ADD CONSTRAINT "Endpoint_mappingSpecId_fkey"
  FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TransactionRun" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputPayload" TEXT NOT NULL,
    "outputPayload" TEXT,
    "inputSize" INTEGER NOT NULL,
    "outputSize" INTEGER,
    "mappedCount" INTEGER,
    "unmappedCount" INTEGER,
    "transactionCount" INTEGER,
    "errorMessage" TEXT,
    "errorStage" TEXT,
    "egressStatus" INTEGER,
    "egressBody" TEXT,
    "egressError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transformedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "TransactionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransactionRun_endpointId_receivedAt_idx" ON "TransactionRun"("endpointId", "receivedAt" DESC);
CREATE INDEX "TransactionRun_partnerId_receivedAt_idx" ON "TransactionRun"("partnerId", "receivedAt" DESC);
CREATE INDEX "TransactionRun_mappingSpecId_idx" ON "TransactionRun"("mappingSpecId");
CREATE INDEX "TransactionRun_status_idx" ON "TransactionRun"("status");

ALTER TABLE "TransactionRun"
  ADD CONSTRAINT "TransactionRun_endpointId_fkey"
  FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionRun"
  ADD CONSTRAINT "TransactionRun_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionRun"
  ADD CONSTRAINT "TransactionRun_mappingSpecId_fkey"
  FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
