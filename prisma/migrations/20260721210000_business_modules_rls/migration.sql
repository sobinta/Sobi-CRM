-- Tenant isolation (RLS) + runtime-role grants for the new business-module
-- tables. Mirrors the loop in 20260720220000_tenant_isolation_rls for the
-- standard tenantId-scoped tables (Policy, Claim, Service, …).

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'BankPartner', 'LoanApplication', 'Property', 'Viewing', 'ImmigrationCase'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY sobi_tenant_isolation ON %I TO sobi_tenant_runtime USING ("tenantId" = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY sobi_system_access ON %I TO sobi_system_runtime USING (true) WITH CHECK (true)',
      table_name
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO sobi_tenant_runtime, sobi_system_runtime',
      table_name
    );
  END LOOP;
END $$;
