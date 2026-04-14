-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scac" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'onboarding',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingSpec" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "txType" TEXT NOT NULL,
    "ediVersion" TEXT NOT NULL,
    "sourceFormat" TEXT NOT NULL,
    "targetFormat" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MappingSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "sourceFieldId" TEXT NOT NULL,
    "targetFieldId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOverride" (
    "id" TEXT NOT NULL,
    "fieldMappingId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT,
    "condition" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopConfig" (
    "id" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "loopId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "condition" TEXT,
    "limit" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "fieldMappingId" TEXT,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLogEntry" (
    "id" TEXT NOT NULL,
    "mappingSpecId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MappingSpec_partnerId_idx" ON "MappingSpec"("partnerId");

-- CreateIndex
CREATE INDEX "MappingSpec_txType_ediVersion_idx" ON "MappingSpec"("txType", "ediVersion");

-- CreateIndex
CREATE INDEX "FieldMapping_mappingSpecId_idx" ON "FieldMapping"("mappingSpecId");

-- CreateIndex
CREATE INDEX "FieldMapping_sourceFieldId_idx" ON "FieldMapping"("sourceFieldId");

-- CreateIndex
CREATE INDEX "FieldMapping_targetFieldId_idx" ON "FieldMapping"("targetFieldId");

-- CreateIndex
CREATE INDEX "CustomerOverride_fieldMappingId_idx" ON "CustomerOverride"("fieldMappingId");

-- CreateIndex
CREATE INDEX "CustomerOverride_customerName_idx" ON "CustomerOverride"("customerName");

-- CreateIndex
CREATE INDEX "LoopConfig_mappingSpecId_idx" ON "LoopConfig"("mappingSpecId");

-- CreateIndex
CREATE INDEX "Comment_mappingSpecId_idx" ON "Comment"("mappingSpecId");

-- CreateIndex
CREATE INDEX "Comment_fieldMappingId_idx" ON "Comment"("fieldMappingId");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_mappingSpecId_idx" ON "ChangeLogEntry"("mappingSpecId");

-- AddForeignKey
ALTER TABLE "MappingSpec" ADD CONSTRAINT "MappingSpec_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMapping" ADD CONSTRAINT "FieldMapping_mappingSpecId_fkey" FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOverride" ADD CONSTRAINT "CustomerOverride_fieldMappingId_fkey" FOREIGN KEY ("fieldMappingId") REFERENCES "FieldMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopConfig" ADD CONSTRAINT "LoopConfig_mappingSpecId_fkey" FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_mappingSpecId_fkey" FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_fieldMappingId_fkey" FOREIGN KEY ("fieldMappingId") REFERENCES "FieldMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLogEntry" ADD CONSTRAINT "ChangeLogEntry_mappingSpecId_fkey" FOREIGN KEY ("mappingSpecId") REFERENCES "MappingSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

