# Security & GDPR

## Tenant isolation
Every tenant-scoped model carries `tenantId`. The Prisma client extension in
`core/db.ts` injects the current context's `tenantId` into the `where` of reads
and writes and stamps it on creates — so a request can never reach another
tenant's rows, even if a handler forgets to filter. System/cross-tenant work
(seeding, the job runner, portal intake) uses the explicit `rawDb` client.

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

## GDPR
- **Consent** — `ConsentRecord` tracks purpose-scoped consent per subject.
- **Right of access** — export a contact's full data bundle as JSON
  (`/api/v1/gdpr/contacts/[id]/export`), logged as a `DataRequest`.
- **Right to erasure** — anonymizes the contact and redacts free-text notes
  while preserving referential integrity; logged and audited.
- **Retention** — `RetentionPolicy` defines per-category retain-then-
  anonymize/delete windows (enforcement runs as a scheduled job).
- **Soft delete + recovery** across core models via the `deletedAt` convention.
