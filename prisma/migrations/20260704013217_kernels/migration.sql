-- CreateEnum
CREATE TYPE "RuleKind" AS ENUM ('VALIDATION', 'ELIGIBILITY', 'APPROVAL', 'CALCULATION', 'VISIBILITY', 'COMPLIANCE', 'CONSTRAINT');

-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('DOCUMENT', 'EMAIL', 'REPORT', 'INVOICE', 'CONTRACT', 'DASHBOARD', 'FORM', 'WORKFLOW', 'AUTOMATION', 'PROMPT', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "EntityDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" TEXT NOT NULL,
    "namePlural" TEXT NOT NULL,
    "nameSingular" TEXT NOT NULL,
    "icon" TEXT,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EntityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityDefId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'table',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityDefId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "ownerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RuleKind" NOT NULL,
    "entityType" TEXT,
    "condition" JSONB NOT NULL DEFAULT '{}',
    "effect" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "TemplateKind" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "body" TEXT,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "label" TEXT,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityDefinition_tenantId_idx" ON "EntityDefinition"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityDefinition_tenantId_key_key" ON "EntityDefinition"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ViewDefinition_tenantId_entityDefId_idx" ON "ViewDefinition"("tenantId", "entityDefId");

-- CreateIndex
CREATE INDEX "CustomRecord_tenantId_entityDefId_idx" ON "CustomRecord"("tenantId", "entityDefId");

-- CreateIndex
CREATE INDEX "CustomRecord_tenantId_ownerId_idx" ON "CustomRecord"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "RuleDefinition_tenantId_entityType_idx" ON "RuleDefinition"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "RuleDefinition_tenantId_kind_idx" ON "RuleDefinition"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "RuleDefinition_tenantId_key_key" ON "RuleDefinition"("tenantId", "key");

-- CreateIndex
CREATE INDEX "Template_tenantId_kind_idx" ON "Template"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Template_tenantId_kind_key_locale_key" ON "Template"("tenantId", "kind", "key", "locale");

-- CreateIndex
CREATE INDEX "ConfigVersion_tenantId_objectType_objectId_idx" ON "ConfigVersion"("tenantId", "objectType", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigVersion_tenantId_objectType_objectId_version_key" ON "ConfigVersion"("tenantId", "objectType", "objectId", "version");

-- AddForeignKey
ALTER TABLE "ViewDefinition" ADD CONSTRAINT "ViewDefinition_entityDefId_fkey" FOREIGN KEY ("entityDefId") REFERENCES "EntityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRecord" ADD CONSTRAINT "CustomRecord_entityDefId_fkey" FOREIGN KEY ("entityDefId") REFERENCES "EntityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
