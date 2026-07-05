-- CreateTable
CREATE TABLE "AiSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "model" TEXT,
    "enabledSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proposal" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "entityType" TEXT,
    "entityId" TEXT,
    "proposedBy" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEmployee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvalPolicy" TEXT NOT NULL DEFAULT 'always_ask',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSetting_tenantId_key" ON "AiSetting"("tenantId");

-- CreateIndex
CREATE INDEX "Prompt_tenantId_key_idx" ON "Prompt"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_tenantId_key_version_key" ON "Prompt"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "AiAction_tenantId_status_idx" ON "AiAction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AiAction_tenantId_entityType_entityId_idx" ON "AiAction"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AiLog_tenantId_createdAt_idx" ON "AiLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AiLog_tenantId_skill_idx" ON "AiLog"("tenantId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "AiEmployee_tenantId_key_key" ON "AiEmployee"("tenantId", "key");
