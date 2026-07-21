DROP POLICY IF EXISTS sobi_calendar_reminder_tenant ON "CalendarReminder";

CREATE POLICY sobi_calendar_reminder_tenant ON "CalendarReminder"
  TO sobi_tenant_runtime
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "membershipId" = current_setting('app.membership_id', true)
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    AND "membershipId" = current_setting('app.membership_id', true)
  );
