CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED');

ALTER TABLE "PricingPlan"
  ADD COLUMN "entitlements" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "limits" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "externalCustomerId" TEXT,
  "externalSubscriptionId" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");
CREATE INDEX "TenantSubscription_tenantId_status_idx" ON "TenantSubscription"("tenantId", "status");
CREATE INDEX "TenantSubscription_provider_externalSubscriptionId_idx" ON "TenantSubscription"("provider", "externalSubscriptionId");

CREATE TABLE "UsageCounter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "value" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UsageCounter_tenantId_metric_periodStart_key" ON "UsageCounter"("tenantId", "metric", "periodStart");
CREATE INDEX "UsageCounter_tenantId_periodEnd_idx" ON "UsageCounter"("tenantId", "periodEnd");

CREATE TABLE "ImportRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
  "mapping" JSONB NOT NULL DEFAULT '{}',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "succeededRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB NOT NULL DEFAULT '[]',
  "createdById" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportRun_tenantId_status_createdAt_idx" ON "ImportRun"("tenantId", "status", "createdAt");
CREATE INDEX "ImportRun_tenantId_entityType_createdAt_idx" ON "ImportRun"("tenantId", "entityType", "createdAt");
CREATE UNIQUE INDEX "ImportRun_tenantId_id_key" ON "ImportRun"("tenantId", "id");

ALTER TABLE "Contact" ADD COLUMN "importRunId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "importRow" INTEGER;
CREATE UNIQUE INDEX "Contact_tenantId_importRunId_importRow_key" ON "Contact"("tenantId", "importRunId", "importRow");

ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_planKey_fkey" FOREIGN KEY ("planKey") REFERENCES "PricingPlan"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_importRunId_fkey" FOREIGN KEY ("tenantId", "importRunId") REFERENCES "ImportRun"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['TenantSubscription', 'UsageCounter', 'ImportRun'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY sobi_tenant_isolation ON %I TO sobi_tenant_runtime USING ("tenantId" = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true))', table_name);
    EXECUTE format('CREATE POLICY sobi_system_access ON %I TO sobi_system_runtime USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO sobi_tenant_runtime, sobi_system_runtime', table_name);
  END LOOP;
END
$$;
