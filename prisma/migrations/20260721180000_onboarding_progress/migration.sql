CREATE TABLE "OnboardingProgress" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "tourKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingProgress_tenantId_membershipId_tourKey_version_key"
  ON "OnboardingProgress"("tenantId", "membershipId", "tourKey", "version");
CREATE INDEX "OnboardingProgress_tenantId_membershipId_idx"
  ON "OnboardingProgress"("tenantId", "membershipId");

ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER sobi_onboarding_progress_member_tenant
  BEFORE INSERT OR UPDATE OF "membershipId", "tenantId" ON "OnboardingProgress"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'membershipId');

ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingProgress" FORCE ROW LEVEL SECURITY;

CREATE POLICY sobi_onboarding_progress_tenant ON "OnboardingProgress"
  TO sobi_tenant_runtime
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "membershipId" = current_setting('app.membership_id', true)
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "membershipId" = current_setting('app.membership_id', true)
  );

CREATE POLICY sobi_onboarding_progress_system ON "OnboardingProgress"
  TO sobi_system_runtime USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "OnboardingProgress"
  TO sobi_tenant_runtime, sobi_system_runtime;
