-- CreateTable
CREATE TABLE "ImmigrationCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "contactId" TEXT,
    "visaType" TEXT NOT NULL DEFAULT 'work',
    "authority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "deadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdById" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ImmigrationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankPartner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "contactId" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'personal',
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "bankPartnerId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdById" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "propertyType" TEXT NOT NULL DEFAULT 'apartment',
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "bedrooms" INTEGER,
    "areaSqm" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'available',
    "ownerId" TEXT,
    "createdById" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT,
    "visitorName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedback" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImmigrationCase_tenantId_status_idx" ON "ImmigrationCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImmigrationCase_tenantId_deadline_idx" ON "ImmigrationCase"("tenantId", "deadline");

-- CreateIndex
CREATE INDEX "ImmigrationCase_tenantId_ownerId_idx" ON "ImmigrationCase"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "BankPartner_tenantId_idx" ON "BankPartner"("tenantId");

-- CreateIndex
CREATE INDEX "LoanApplication_tenantId_status_idx" ON "LoanApplication"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoanApplication_tenantId_bankPartnerId_idx" ON "LoanApplication"("tenantId", "bankPartnerId");

-- CreateIndex
CREATE INDEX "LoanApplication_tenantId_ownerId_idx" ON "LoanApplication"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "Property_tenantId_status_idx" ON "Property"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Property_tenantId_propertyType_idx" ON "Property"("tenantId", "propertyType");

-- CreateIndex
CREATE INDEX "Viewing_tenantId_status_idx" ON "Viewing"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Viewing_tenantId_propertyId_idx" ON "Viewing"("tenantId", "propertyId");

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_bankPartnerId_fkey" FOREIGN KEY ("bankPartnerId") REFERENCES "BankPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
