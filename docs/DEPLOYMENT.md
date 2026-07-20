# Deployment

## Environment
Required: `DATABASE_URL`, `IDENTITY_DATABASE_URL`, `SYSTEM_DATABASE_URL`,
`DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`NEXT_PUBLIC_APP_URL`. Recommended: `FIELD_ENCRYPTION_KEY` (32 bytes base64),
`FILE_SIGNING_SECRET`, `JOB_RUNNER_SECRET`, `RATE_LIMIT_REDIS_URL`, S3 storage
settings, and SMTP settings. Optional: AI provider keys
(`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `AI_LOCAL_ENDPOINT`) — omit to run AI
in mock mode. See `.env.example`.

The four database URLs are security capabilities, not aliases:

- `DATABASE_URL` is the pooled, least-privilege tenant runtime connection.
- `IDENTITY_DATABASE_URL` can access auth and identity tables, not CRM data.
- `SYSTEM_DATABASE_URL` is reserved for provisioning and audited dispatchers.
- `DIRECT_URL` is the non-pooled migration-owner connection used only by
  Prisma migrations.

The migration creates the group roles and RLS policies, but managed providers
may require an administrator to provision LOGIN roles and passwords first.
Runtime roles must not own tables and must be `NOSUPERUSER NOBYPASSRLS`.
Set `TENANT_DB_SECURITY_CHECK=strict`; startup then validates the deployed
role and policy posture before serving requests.

Production startup treats `BETTER_AUTH_SECRET`, `FILE_SIGNING_SECRET`, and
`JOB_RUNNER_SECRET` as separate 32+ character secrets and requires a valid
32-byte base64 `FIELD_ENCRYPTION_KEY`. `BETTER_AUTH_URL` and
`NEXT_PUBLIC_APP_URL` must use HTTPS. `WEBHOOK_ALLOW_PRIVATE_NETWORKS=true` is
development-only and causes production startup to fail. Production also
requires `RATE_LIMIT_BACKEND=redis` and `FILE_STORAGE_DRIVER=s3`; startup
rejects missing Redis/S3 configuration, insecure custom S3 endpoints, or
partial custom-endpoint credentials.

`BILLING_PROVIDER=manual` is the implemented local/manual-invoice mode. It
enforces subscriptions and quotas but does not collect payment. Do not market
automatic billing until a PSP adapter and verified webhook handler are added.

## Fresh local database

The role initialization script runs only when the PostgreSQL volume is first
created. Because this project has no production data yet, migrate an older
local volume by recreating it, then deploy and seed:

```bash
docker compose down -v
docker compose up -d
npm run db:deploy
npm run db:seed
npm run test:rls
```

`down -v` deletes the local database and must never be used against a volume
containing data that must be retained.

## Options

### Managed platform (recommended)
- **App:** Vercel or any Node host. `npm run build && npm run start`.
- **Database:** a managed Postgres 16 (Neon, Supabase, RDS). Run
  `npx prisma migrate deploy` on release.
- **Email:** any SMTP provider (swap Mailpit).
- **Rate limiting:** managed Redis over TLS (`rediss://`) is the production
  source of truth. An outage fails public throttling closed with 503/denial.
- **Files:** configure the built-in S3-compatible provider for AWS S3, MinIO,
  or another compatible object store. Prefer workload identity on AWS; custom
  endpoints require explicit credentials and HTTPS. Add provider-side malware
  scanning and a quarantine bucket before accepting untrusted binary uploads.

### Self-hosted (Docker)
`docker-compose.yml` provisions Postgres, Redis, Mailpit, and MinIO for full
local integration. MinIO's console is on port 9001 and the private
`sobi-files` bucket is created automatically. Extend Compose with an app
service (`node` image running `npm run start`) for a complete self-hosted stack.

## Background jobs
The PostgreSQL-backed runner is triggered by `POST /api/internal/jobs/tick`
(protected by `JOB_RUNNER_SECRET` via `x-internal-secret`). Schedule it every
minute with the platform scheduler / an external cron. Claims use
`FOR UPDATE SKIP LOCKED`, crash-safe leases, capped exponential retry, and a
durable event outbox. Multiple workers may tick concurrently. Set
`JOB_LEASE_MS` above the longest normal handler duration.

## Release checklist
1. `npm run typecheck && npm run lint && npm run test` — all green.
2. Deploy migrations through `DIRECT_URL`, then run `npm run test:rls`.
3. Confirm the startup tenant-database security check passes in strict mode.
4. Set production env (real URLs/secrets, Redis, S3, SMTP, encryption key).
5. Verify Redis/S3 connectivity, CSP/HSTS headers, and AI keys (if any).
6. Confirm the intended billing mode, active plans, limits, and a test tenant's
   subscription/usage counters.
7. Confirm `npm audit --audit-level=moderate` reports zero known issues.
8. Smoke: register → onboard → activate a module → create records → export a
   report → check the health dashboard.

See [TESTING.md](TESTING.md) for the full verification checklist.
