# Deployment

## Environment
Required: `DATABASE_URL`, `IDENTITY_DATABASE_URL`, `SYSTEM_DATABASE_URL`,
`DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`NEXT_PUBLIC_APP_URL`. Recommended: `FIELD_ENCRYPTION_KEY` (32 bytes base64),
`FILE_SIGNING_SECRET`, SMTP settings. Optional: AI provider keys
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
- **Files:** the local-disk provider works on a single host; for multi-instance
  swap `engines/files/storage.ts` for the S3-compatible implementation (the
  interface is already S3-shaped).

### Self-hosted (Docker)
`docker-compose.yml` provisions Postgres + Mailpit for development; extend it
with an app service (`node` image running `npm run start`) and a managed volume
for `/storage`, or point file storage at object storage.

## Background jobs
The DB-backed runner is triggered by `POST /api/v1/internal/jobs/tick`
(protected by `BETTER_AUTH_SECRET` via `x-internal-secret`). Schedule it every
1–5 minutes with the platform scheduler / an external cron. Handlers: reminders,
overdue scans, automation timers.

## Release checklist
1. `npm run typecheck && npm run lint && npm run test` — all green.
2. Deploy migrations through `DIRECT_URL`, then run `npm run test:rls`.
3. Confirm the startup tenant-database security check passes in strict mode.
4. Set production env (real `BETTER_AUTH_URL`, secrets, SMTP, encryption key).
5. Verify CSP/HSTS headers and that AI keys (if any) resolve.
6. Smoke: register → onboard → activate a module → create records → export a
   report → check the health dashboard.

See [TESTING.md](TESTING.md) for the full verification checklist.
