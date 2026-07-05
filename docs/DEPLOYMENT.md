# Deployment

## Environment
Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`NEXT_PUBLIC_APP_URL`. Recommended: `FIELD_ENCRYPTION_KEY` (32 bytes base64),
`FILE_SIGNING_SECRET`, SMTP settings. Optional: AI provider keys
(`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `AI_LOCAL_ENDPOINT`) — omit to run AI
in mock mode. See `.env.example`.

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
2. `npx prisma migrate deploy`.
3. Set production env (real `BETTER_AUTH_URL`, secrets, SMTP, encryption key).
4. Verify CSP/HSTS headers and that AI keys (if any) resolve.
5. Smoke: register → onboard → activate a module → create records → export a
   report → check the health dashboard.

See [TESTING.md](TESTING.md) for the full verification checklist.
