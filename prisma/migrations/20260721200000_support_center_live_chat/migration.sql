-- Restore the cross-tenant import guard that an earlier schema drift omitted.
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_importRunId_fkey"
  FOREIGN KEY ("tenantId", "importRunId") REFERENCES "ImportRun"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every membership reference must belong to the row's tenant, even when a
-- future code path bypasses the ORM extension.
CREATE TRIGGER sobi_support_ticket_requester_tenant
  BEFORE INSERT OR UPDATE OF "requesterMembershipId", "tenantId" ON "SupportTicket"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'requesterMembershipId');
CREATE TRIGGER sobi_support_message_sender_tenant
  BEFORE INSERT OR UPDATE OF "senderMembershipId", "tenantId" ON "SupportMessage"
  FOR EACH ROW WHEN (NEW."senderMembershipId" IS NOT NULL)
  EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'senderMembershipId');

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_support_ticket_customer ON "SupportTicket" TO sobi_tenant_runtime
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "requesterMembershipId" = current_setting('app.membership_id', true)
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "requesterMembershipId" = current_setting('app.membership_id', true)
  );
CREATE POLICY sobi_support_ticket_system ON "SupportTicket" TO sobi_system_runtime
  USING (true) WITH CHECK (true);

ALTER TABLE "SupportMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_support_message_customer ON "SupportMessage" TO sobi_tenant_runtime
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    AND EXISTS (
      SELECT 1 FROM "SupportTicket" ticket
      WHERE ticket."tenantId" = "SupportMessage"."tenantId"
        AND ticket."id" = "SupportMessage"."ticketId"
        AND ticket."requesterMembershipId" = current_setting('app.membership_id', true)
    )
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "senderKind" = 'CUSTOMER'
    AND "senderMembershipId" = current_setting('app.membership_id', true)
    AND EXISTS (
      SELECT 1 FROM "SupportTicket" ticket
      WHERE ticket."tenantId" = "SupportMessage"."tenantId"
        AND ticket."id" = "SupportMessage"."ticketId"
        AND ticket."requesterMembershipId" = current_setting('app.membership_id', true)
    )
  );
CREATE POLICY sobi_support_message_system ON "SupportMessage" TO sobi_system_runtime
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE "SupportTicket" TO sobi_tenant_runtime;
GRANT SELECT, INSERT ON TABLE "SupportMessage" TO sobi_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SupportTicket", "SupportMessage" TO sobi_system_runtime;
