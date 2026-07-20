-- Event is the durable outbox. It is marked dispatched only in the same
-- system transaction that inserts all named consumer jobs.
ALTER TABLE "Event" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "AutomationRun" ADD COLUMN "eventId" TEXT;

CREATE UNIQUE INDEX "Event_tenantId_id_key" ON "Event"("tenantId", "id");
CREATE INDEX "Event_dispatchedAt_occurredAt_idx" ON "Event"("dispatchedAt", "occurredAt");
CREATE UNIQUE INDEX "AutomationRun_automationId_eventId_key" ON "AutomationRun"("automationId", "eventId");
CREATE UNIQUE INDEX "Webhook_tenantId_id_key" ON "Webhook"("tenantId", "id");

ALTER TABLE "AutomationRun"
  ADD CONSTRAINT "AutomationRun_tenantId_eventId_fkey"
  FOREIGN KEY ("tenantId", "eventId")
  REFERENCES "Event"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastStatus" INTEGER,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookDelivery_webhookId_eventId_key"
  ON "WebhookDelivery"("webhookId", "eventId");
CREATE INDEX "WebhookDelivery_tenantId_status_createdAt_idx"
  ON "WebhookDelivery"("tenantId", "status", "createdAt");
CREATE INDEX "WebhookDelivery_tenantId_eventId_idx"
  ON "WebhookDelivery"("tenantId", "eventId");

ALTER TABLE "WebhookDelivery"
  ADD CONSTRAINT "WebhookDelivery_tenantId_webhookId_fkey"
  FOREIGN KEY ("tenantId", "webhookId")
  REFERENCES "Webhook"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery"
  ADD CONSTRAINT "WebhookDelivery_tenantId_eventId_fkey"
  FOREIGN KEY ("tenantId", "eventId")
  REFERENCES "Event"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_tenant_isolation ON "WebhookDelivery" TO sobi_tenant_runtime
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_system_access ON "WebhookDelivery" TO sobi_system_runtime
  USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "WebhookDelivery"
  TO sobi_tenant_runtime, sobi_system_runtime;
