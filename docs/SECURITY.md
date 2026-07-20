# Security & GDPR

## Tenant isolation
Tenant isolation is enforced twice. The tenant Prisma capability in
`core/db.ts` fails closed without a `PlatformContext`, injects the active
tenant into reads and mutations, and overwrites caller-supplied tenant IDs.
PostgreSQL independently enables and forces RLS on every tenant table using a
transaction-local `app.tenant_id`; the value and query run on the same pooled
connection and the setting cannot leak to another request.

There is no general unscoped database export. Separate least-privilege URLs
back the tenant, identity, and narrowly allowlisted system capabilities.
Public slugs/tokens/API keys only resolve a tenant through the system gateway;
business reads and writes then re-enter the tenant capability. Same-tenant
service assertions and PostgreSQL integrity triggers reject foreign relation
IDs without revealing whether the foreign record exists.

Production startup runs a database security self-check and refuses readiness
if the tenant connection is privileged, can bypass RLS, has access to auth or
global tables, or any expected table lacks enabled and forced RLS. Configure
this with `TENANT_DB_SECURITY_CHECK=strict` (the production default).

The `can()` matrix (super-admin → admin override → role grants → ownership →
team visibility → record constraints) is covered by unit tests
(`core/rbac/can.test.ts`).

## Authentication
- Better Auth with email/password, Argon2 hashing, a 10-char minimum policy,
  and DB-backed sessions (httpOnly, SameSite cookies). 2FA-ready.
- Dev trusts `http://localhost:*`; production pins the base URL.

## Application hardening
- **Security headers** (`next.config.ts`): CSP, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in
  production.
- **Input validation** — Zod on every server action and API route; metadata
  drives generated schemas.
- **Rate limiting** — a token-bucket limiter (`core/security/rate-limit.ts`)
  guards the public API and can front auth.
- **Field encryption** — AES-256-GCM (`core/security/encryption.ts`) for
  sensitive fields (income, national IDs); tamper-evident via the GCM tag.
- **File access** — files are never served from public paths; downloads go
  through a permission-checked, audited route.
- **Audit trail** — `AuditLog` records auth, data, file, permission, export,
  admin, security, and AI actions with actor, IP, and before/after snapshots.

## Database capabilities

- `DATABASE_URL`: tenant runtime; no ownership, superuser, `BYPASSRLS`, or
  global/auth-table grants.
- `IDENTITY_DATABASE_URL`: authentication, users, sessions, memberships, and
  RBAC resolution only.
- `SYSTEM_DATABASE_URL`: provisioning, tenant/token discovery, and job
  dispatch only; imports are enforced by ESLint allowlists.
- `DIRECT_URL`: non-pooled migration owner; never used by request code.

The development credentials in `.env.example` are local-only and must never
be reused in staging or production.

## GDPR
- **Consent** — `ConsentRecord` tracks purpose-scoped consent per subject.
- **Right of access** — export a contact's full data bundle as JSON
  (`/api/v1/gdpr/contacts/[id]/export`), logged as a `DataRequest`.
- **Right to erasure** — anonymizes the contact and redacts free-text notes
  while preserving referential integrity; logged and audited.
- **Retention** — `RetentionPolicy` defines per-category retain-then-
  anonymize/delete windows (enforcement runs as a scheduled job).
- **Soft delete + recovery** across core models via the `deletedAt` convention.
