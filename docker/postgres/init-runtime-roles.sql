-- Development-only login roles. Production roles are provisioned by the
-- database platform and use independently managed secrets.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_tenant_runtime') THEN
    CREATE ROLE sobi_tenant_runtime LOGIN PASSWORD 'sobi_tenant_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_identity_runtime') THEN
    CREATE ROLE sobi_identity_runtime LOGIN PASSWORD 'sobi_identity_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sobi_system_runtime') THEN
    CREATE ROLE sobi_system_runtime LOGIN PASSWORD 'sobi_system_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE coreline TO
  sobi_tenant_runtime,
  sobi_identity_runtime,
  sobi_system_runtime;
