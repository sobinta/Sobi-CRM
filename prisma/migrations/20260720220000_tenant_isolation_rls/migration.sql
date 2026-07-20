-- Runtime roles may be pre-created as LOGIN roles by the deployment platform.
-- NOLOGIN group roles keep migration validation reproducible when supported.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_tenant_runtime') THEN
    CREATE ROLE sobi_tenant_runtime NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_identity_runtime') THEN
    CREATE ROLE sobi_identity_runtime NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_system_runtime') THEN
    CREATE ROLE sobi_system_runtime NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

-- A row-level tenant check is not enough for foreign keys: PostgreSQL's FK
-- machinery can otherwise link a tenant-owned child to another tenant's
-- parent. This reusable trigger rejects such links independently of the app.
CREATE OR REPLACE FUNCTION sobi_assert_same_tenant_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  reference_id text;
  reference_tenant_id text;
  reference_found boolean := false;
BEGIN
  reference_id := to_jsonb(NEW) ->> TG_ARGV[1];
  IF reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT "tenantId", true FROM %s WHERE "id" = $1',
    TG_ARGV[0]::regclass
  )
  INTO reference_tenant_id, reference_found
  USING reference_id;

  IF NOT reference_found OR (
    reference_tenant_id IS DISTINCT FROM NEW."tenantId"
    AND NOT (COALESCE(TG_ARGV[2], '') = 'allow_shared' AND reference_tenant_id IS NULL)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'foreign_key_violation',
      MESSAGE = 'Tenant relation integrity violation';
  END IF;

  RETURN NEW;
END
$$;

-- Trigger names deliberately encode the child column so schema reviews make
-- the protected relation obvious. Polymorphic links are validated in the app
-- because their parent table is selected by entityType.
CREATE TRIGGER sobi_contact_company_tenant
  BEFORE INSERT OR UPDATE OF "companyId", "tenantId" ON "Contact"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Company"', 'companyId');
CREATE TRIGGER sobi_lead_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "Lead"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');
CREATE TRIGGER sobi_stage_pipeline_tenant
  BEFORE INSERT OR UPDATE OF "pipelineId", "tenantId" ON "Stage"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Pipeline"', 'pipelineId');
CREATE TRIGGER sobi_deal_pipeline_tenant
  BEFORE INSERT OR UPDATE OF "pipelineId", "tenantId" ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Pipeline"', 'pipelineId');
CREATE TRIGGER sobi_deal_stage_tenant
  BEFORE INSERT OR UPDATE OF "stageId", "tenantId" ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Stage"', 'stageId');
CREATE TRIGGER sobi_deal_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');
CREATE TRIGGER sobi_deal_company_tenant
  BEFORE INSERT OR UPDATE OF "companyId", "tenantId" ON "Deal"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Company"', 'companyId');
CREATE TRIGGER sobi_team_parent_tenant
  BEFORE INSERT OR UPDATE OF "parentId", "tenantId" ON "Team"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Team"', 'parentId');
CREATE TRIGGER sobi_view_definition_entity_tenant
  BEFORE INSERT OR UPDATE OF "entityDefId", "tenantId" ON "ViewDefinition"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"EntityDefinition"', 'entityDefId', 'allow_shared');
CREATE TRIGGER sobi_custom_record_entity_tenant
  BEFORE INSERT OR UPDATE OF "entityDefId", "tenantId" ON "CustomRecord"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"EntityDefinition"', 'entityDefId');
CREATE TRIGGER sobi_entity_tag_tag_tenant
  BEFORE INSERT OR UPDATE OF "tagId", "tenantId" ON "EntityTag"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Tag"', 'tagId');
CREATE TRIGGER sobi_campaign_email_campaign_tenant
  BEFORE INSERT OR UPDATE OF "campaignId", "tenantId" ON "CampaignEmail"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Campaign"', 'campaignId');
CREATE TRIGGER sobi_campaign_email_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "CampaignEmail"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');
CREATE TRIGGER sobi_campaign_email_lead_tenant
  BEFORE INSERT OR UPDATE OF "leadId", "tenantId" ON "CampaignEmail"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Lead"', 'leadId');
CREATE TRIGGER sobi_contract_deal_tenant
  BEFORE INSERT OR UPDATE OF "dealId", "tenantId" ON "Contract"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Deal"', 'dealId');
CREATE TRIGGER sobi_contract_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "Contract"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');
CREATE TRIGGER sobi_contract_company_tenant
  BEFORE INSERT OR UPDATE OF "companyId", "tenantId" ON "Contract"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Company"', 'companyId');
CREATE TRIGGER sobi_file_version_file_tenant
  BEFORE INSERT OR UPDATE OF "fileId", "tenantId" ON "FileVersion"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"FileObject"', 'fileId');
CREATE TRIGGER sobi_checklist_file_tenant
  BEFORE INSERT OR UPDATE OF "fileId", "tenantId" ON "DocumentChecklistItem"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"FileObject"', 'fileId');
CREATE TRIGGER sobi_task_parent_tenant
  BEFORE INSERT OR UPDATE OF "parentId", "tenantId" ON "Task"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Task"', 'parentId');
CREATE TRIGGER sobi_task_dependency_tenant
  BEFORE INSERT OR UPDATE OF "dependsOnId", "tenantId" ON "Task"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Task"', 'dependsOnId');
CREATE TRIGGER sobi_task_comment_task_tenant
  BEFORE INSERT OR UPDATE OF "taskId", "tenantId" ON "TaskComment"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Task"', 'taskId');
CREATE TRIGGER sobi_event_attendee_event_tenant
  BEFORE INSERT OR UPDATE OF "eventId", "tenantId" ON "EventAttendee"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"CalendarEvent"', 'eventId');
CREATE TRIGGER sobi_event_attendee_member_tenant
  BEFORE INSERT OR UPDATE OF "membershipId", "tenantId" ON "EventAttendee"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'membershipId');
CREATE TRIGGER sobi_notification_member_tenant
  BEFORE INSERT OR UPDATE OF "membershipId", "tenantId" ON "Notification"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'membershipId');
CREATE TRIGGER sobi_notification_pref_member_tenant
  BEFORE INSERT OR UPDATE OF "membershipId", "tenantId" ON "NotificationPreference"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Membership"', 'membershipId');
CREATE TRIGGER sobi_automation_run_automation_tenant
  BEFORE INSERT OR UPDATE OF "automationId", "tenantId" ON "AutomationRun"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Automation"', 'automationId');
CREATE TRIGGER sobi_policy_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "Policy"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');
CREATE TRIGGER sobi_policy_carrier_tenant
  BEFORE INSERT OR UPDATE OF "carrierId", "tenantId" ON "Policy"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"InsuranceCarrier"', 'carrierId');
CREATE TRIGGER sobi_claim_policy_tenant
  BEFORE INSERT OR UPDATE OF "policyId", "tenantId" ON "Claim"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Policy"', 'policyId');
CREATE TRIGGER sobi_appointment_service_tenant
  BEFORE INSERT OR UPDATE OF "serviceId", "tenantId" ON "Appointment"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Service"', 'serviceId');
CREATE TRIGGER sobi_appointment_staff_tenant
  BEFORE INSERT OR UPDATE OF "staffId", "tenantId" ON "Appointment"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"StaffMember"', 'staffId');
CREATE TRIGGER sobi_appointment_contact_tenant
  BEFORE INSERT OR UPDATE OF "contactId", "tenantId" ON "Appointment"
  FOR EACH ROW EXECUTE FUNCTION sobi_assert_same_tenant_reference('"Contact"', 'contactId');

GRANT USAGE ON SCHEMA public TO
  sobi_tenant_runtime,
  sobi_identity_runtime,
  sobi_system_runtime;

-- Direct tenant tables all share the same tenantId invariant.
DO $$
DECLARE
  table_name text;
  direct_tables text[] := ARRAY[
    'Membership', 'Team', 'Role', 'Event', 'Job', 'AuditLog',
    'FeatureGrant', 'ModuleState', 'ViewDefinition', 'CustomRecord',
    'RuleDefinition', 'Template', 'ConfigVersion', 'Company', 'Contact',
    'Lead', 'Pipeline', 'Stage', 'Deal', 'Tag', 'EntityTag', 'Note',
    'Activity', 'Relationship', 'Conversation', 'Contract', 'Campaign',
    'CampaignEmail', 'FileObject', 'FileVersion', 'DocumentChecklistItem',
    'Task', 'TaskComment', 'CalendarEvent', 'EventAttendee', 'Notification',
    'NotificationPreference', 'Communication', 'Dashboard',
    'ReportDefinition', 'Automation', 'AutomationRun', 'Webhook', 'ApiKey',
    'WorkflowDefinition', 'ApprovalRequest', 'InsuranceCarrier', 'Policy',
    'Claim', 'Service', 'StaffMember', 'Appointment', 'AiSetting', 'Prompt',
    'AiAction', 'AiLog', 'AiEmployee', 'ConsentRecord', 'DataRequest',
    'RetentionPolicy', 'KnowledgeArticle'
  ];
BEGIN
  FOREACH table_name IN ARRAY direct_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS sobi_tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY sobi_tenant_isolation ON %I TO sobi_tenant_runtime USING ("tenantId" = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true))',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS sobi_system_access ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY sobi_system_access ON %I TO sobi_system_runtime USING (true) WITH CHECK (true)',
      table_name
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO sobi_tenant_runtime, sobi_system_runtime',
      table_name
    );
  END LOOP;
END
$$;

-- The current tenant row is scoped by its own primary key.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_tenant_root ON "Tenant" TO sobi_tenant_runtime
  USING ("id" = current_setting('app.tenant_id', true))
  WITH CHECK ("id" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_identity_tenants ON "Tenant" TO sobi_identity_runtime
  USING (true);
CREATE POLICY sobi_system_tenants ON "Tenant" TO sobi_system_runtime
  USING (true) WITH CHECK (true);
GRANT SELECT, UPDATE ON TABLE "Tenant" TO sobi_tenant_runtime;
GRANT SELECT ON TABLE "Tenant" TO sobi_identity_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Tenant" TO sobi_system_runtime;

-- Users are visible to a tenant only through an active membership.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_tenant_users ON "User" FOR SELECT TO sobi_tenant_runtime
  USING (
    EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."userId" = "User"."id"
        AND m."tenantId" = current_setting('app.tenant_id', true)
        AND m."status" = 'ACTIVE'
        AND m."deletedAt" IS NULL
    )
  );
CREATE POLICY sobi_identity_users ON "User" TO sobi_identity_runtime
  USING (true) WITH CHECK (true);
CREATE POLICY sobi_system_users ON "User" TO sobi_system_runtime
  USING (true) WITH CHECK (true);
GRANT SELECT ON TABLE "User" TO sobi_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO sobi_identity_runtime, sobi_system_runtime;

-- Shared built-in entity definitions are readable but only tenant-owned
-- definitions may be mutated by the tenant runtime.
ALTER TABLE "EntityDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntityDefinition" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_entity_read ON "EntityDefinition" FOR SELECT TO sobi_tenant_runtime
  USING ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_entity_insert ON "EntityDefinition" FOR INSERT TO sobi_tenant_runtime
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_entity_update ON "EntityDefinition" FOR UPDATE TO sobi_tenant_runtime
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_entity_delete ON "EntityDefinition" FOR DELETE TO sobi_tenant_runtime
  USING ("tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY sobi_system_entities ON "EntityDefinition" TO sobi_system_runtime
  USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "EntityDefinition" TO
  sobi_tenant_runtime,
  sobi_system_runtime;

-- Join tables inherit tenant ownership through their protected parent rows.
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_team_members ON "TeamMember" TO sobi_tenant_runtime
  USING (
    EXISTS (SELECT 1 FROM "Team" p WHERE p."id" = "TeamMember"."teamId")
    AND EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."id" = "TeamMember"."membershipId"
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "Team" p WHERE p."id" = "TeamMember"."teamId")
    AND EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."id" = "TeamMember"."membershipId"
    )
  );

ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_role_permissions ON "RolePermission" TO sobi_tenant_runtime
  USING (EXISTS (SELECT 1 FROM "Role" p WHERE p."id" = "RolePermission"."roleId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Role" p WHERE p."id" = "RolePermission"."roleId"));

ALTER TABLE "MembershipRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipRole" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_membership_roles ON "MembershipRole" TO sobi_tenant_runtime
  USING (
    EXISTS (SELECT 1 FROM "Membership" m WHERE m."id" = "MembershipRole"."membershipId")
    AND EXISTS (SELECT 1 FROM "Role" r WHERE r."id" = "MembershipRole"."roleId")
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "Membership" m WHERE m."id" = "MembershipRole"."membershipId")
    AND EXISTS (SELECT 1 FROM "Role" r WHERE r."id" = "MembershipRole"."roleId")
  );

ALTER TABLE "FieldRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldRule" FORCE ROW LEVEL SECURITY;
CREATE POLICY sobi_field_rules ON "FieldRule" TO sobi_tenant_runtime
  USING (EXISTS (SELECT 1 FROM "Role" p WHERE p."id" = "FieldRule"."roleId"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Role" p WHERE p."id" = "FieldRule"."roleId"));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['TeamMember', 'RolePermission', 'MembershipRole', 'FieldRule'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS sobi_system_access ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY sobi_system_access ON %I TO sobi_system_runtime USING (true) WITH CHECK (true)',
      table_name
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO sobi_tenant_runtime, sobi_system_runtime',
      table_name
    );
  END LOOP;
END
$$;

-- Identity resolution needs broad reads on membership/RBAC rows, but no CRM
-- table privileges. Policies are role-specific rather than BYPASSRLS.
CREATE POLICY sobi_identity_memberships ON "Membership" TO sobi_identity_runtime
  USING (true) WITH CHECK (true);
CREATE POLICY sobi_identity_roles ON "Role" FOR SELECT TO sobi_identity_runtime
  USING (true);
CREATE POLICY sobi_identity_role_permissions ON "RolePermission" FOR SELECT TO sobi_identity_runtime
  USING (true);
CREATE POLICY sobi_identity_membership_roles ON "MembershipRole" FOR SELECT TO sobi_identity_runtime
  USING (true);
GRANT SELECT ON TABLE "Membership", "Role", "RolePermission", "MembershipRole" TO sobi_identity_runtime;

-- Better Auth global tables are accessible only to identity and system roles.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Session", "Account", "Verification"
TO sobi_identity_runtime, sobi_system_runtime;

-- System capability owns platform-global configuration access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Feature", "PricingPlan", "LandingContentOverride", "SiteAsset", "AnnouncementBar"
TO sobi_system_runtime;

-- Audit and event logs are append/read-only for ordinary tenant runtime.
REVOKE UPDATE, DELETE ON TABLE "AuditLog", "Event" FROM sobi_tenant_runtime;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO
  sobi_tenant_runtime,
  sobi_identity_runtime,
  sobi_system_runtime;
