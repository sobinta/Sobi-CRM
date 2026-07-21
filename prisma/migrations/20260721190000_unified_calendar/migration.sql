ALTER TABLE "CalendarEvent" ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Task" ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Campaign"
  ADD COLUMN "scheduledStartAt" TIMESTAMP(3),
  ADD COLUMN "scheduledEndAt" TIMESTAMP(3),
  ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Contract"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Policy" ADD COLUMN "customFields" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "Campaign_tenantId_scheduledStartAt_idx" ON "Campaign"("tenantId", "scheduledStartAt");
CREATE INDEX "Campaign_tenantId_scheduledEndAt_idx" ON "Campaign"("tenantId", "scheduledEndAt");
CREATE INDEX "Campaign_tenantId_sentAt_idx" ON "Campaign"("tenantId", "sentAt");
CREATE INDEX "Contract_tenantId_startDate_idx" ON "Contract"("tenantId", "startDate");
CREATE INDEX "Contract_tenantId_expiresAt_idx" ON "Contract"("tenantId", "expiresAt");
CREATE INDEX "Deal_tenantId_expectedCloseAt_idx" ON "Deal"("tenantId", "expectedCloseAt");
CREATE INDEX "Deal_tenantId_closedAt_idx" ON "Deal"("tenantId", "closedAt");

CREATE TABLE "CalendarReminder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "offsetMinutes" INTEGER NOT NULL,
  "triggerAt" TIMESTAMP(3) NOT NULL,
  "jobId" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarReminder_eventId_membershipId_offsetMinutes_key"
  ON "CalendarReminder"("eventId", "membershipId", "offsetMinutes");
CREATE INDEX "CalendarReminder_tenantId_triggerAt_idx" ON "CalendarReminder"("tenantId", "triggerAt");
CREATE INDEX "CalendarReminder_tenantId_membershipId_deliveredAt_idx"
  ON "CalendarReminder"("tenantId", "membershipId", "deliveredAt");

ALTER TABLE "CalendarReminder"
  ADD CONSTRAINT "CalendarReminder_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER sobi_calendar_reminder_event_tenant
  BEFORE INSERT OR UPDATE OF "eventId", "tenantId" ON "CalendarReminder"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"CalendarEvent"', 'eventId');
CREATE TRIGGER sobi_calendar_reminder_member_tenant
  BEFORE INSERT OR UPDATE OF "membershipId", "tenantId" ON "CalendarReminder"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'membershipId');

ALTER TABLE "CalendarReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarReminder" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_calendar_reminder_tenant ON "CalendarReminder"
  TO sobi_tenant_runtime
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_calendar_reminder_system ON "CalendarReminder"
  TO sobi_system_runtime USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "CalendarReminder"
  TO sobi_tenant_runtime, sobi_system_runtime;
