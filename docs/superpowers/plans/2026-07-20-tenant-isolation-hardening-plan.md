# Tenant Isolation Hardening Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-20-tenant-isolation-hardening-design.md`  
**Scope:** Phase 1 only — tenant isolation and PostgreSQL RLS

## Delivery strategy

Implement in small verifiable slices. Every slice ends with focused tests and
must preserve a clean source worktree except for the intended files. UI design
skills are registered for later interface phases; this backend/database phase
does not introduce visual changes.

## 1. Restore a reproducible toolchain

- Repair the incomplete local dependency installation with `npm ci`.
- Run baseline unit tests, lint, typecheck, Prisma generation, and a clean
  production build.
- Record dependency failures separately from source failures.

## 2. Define the security boundary

Files:

- `src/core/tenancy/context.ts`
- `src/core/tenancy/model-metadata.ts`
- new `src/core/tenancy/errors.ts`
- new tenant metadata tests

Work:

- Add typed tenant-context and mismatch errors.
- Classify every Prisma model as global, direct tenant, or relation-scoped.
- Add a schema consistency test that fails when a model is unclassified or a
  direct tenant model is missing from metadata.
- Make context immutable for the lifetime of a request.

## 3. Split database capabilities and fail closed

Files:

- `src/core/db.ts`
- new `src/core/db/tenant-client.ts`
- new `src/core/db/identity-client.ts`
- new `src/core/db/system-client.ts`
- `eslint.config.mjs`

Work:

- Replace broad `rawDb` export with tenant, identity, and system boundaries.
- Require context for every operation through the tenant client.
- Force the active tenant into create/createMany/upsert inputs.
- Apply tenant filters to supported top-level reads and mutations.
- Wrap normal tenant operations in a short transaction that sets the local RLS
  tenant variable on the same connection.
- Provide a reviewed helper for short explicit multi-query transactions.
- Preserve soft-delete helpers without exposing an unscoped escape hatch.
- Add lint restrictions preventing direct system/identity imports outside
  approved modules.

## 4. Convert identity, system, public, and job flows

Files include:

- `src/core/auth/*`
- `src/core/tenancy/provisioning.ts`
- `src/core/jobs/*`
- `src/core/event-bus/bus.ts`
- `src/core/audit/audit.ts`
- `src/engines/portal/portal-service.ts`
- `src/engines/contracts/contract-service.ts`
- `src/engines/integrations/api-key-service.ts`
- automation, notification, campaign, and task job handlers

Work:

- Route auth/session queries through identity capability.
- Route provisioning and tenant discovery through system capability.
- Resolve public slug, token, and API key with narrow gateway functions, then
  execute business work in the resolved tenant context.
- Dispatch each job and event subscriber under the event/job tenant.
- Ensure outbound network calls run after database transactions close.
- Remove all remaining general `rawDb` imports.

## 5. Enforce relation ownership

- Inventory every tenant-owned foreign key and polymorphic reference.
- Add reusable same-tenant lookup assertions returning not found on mismatch.
- Validate high-risk CRM, contract, file, campaign, insurance, task, calendar,
  workflow, automation, and notification relations.
- Add compound tenant constraints where the Prisma/PostgreSQL schema can
  express them without ambiguous nullable keys.

## 6. Add PostgreSQL roles and forced RLS

Files:

- new forward-only Prisma migration
- `docker-compose.yml`
- new local PostgreSQL initialization scripts
- `.env.example`
- `prisma.config.ts`

Work:

- Provision distinct local migration, tenant runtime, identity, and system
  roles with development-only credentials.
- Grant least-privilege table and sequence access.
- Enable and force RLS on every direct tenant table.
- Add `USING` and `WITH CHECK` policies based on the transaction-local tenant
  setting.
- Add explicit policies or direct tenant keys for relation-scoped tables.
- Keep migration ownership separate from all runtime roles.

## 7. Add startup database self-checks

- Verify runtime role attributes, ownership, RLS flags, policy presence, and
  connection-role separation.
- Fail production readiness on unsafe configuration.
- Surface actionable local-development diagnostics without exposing secrets.

## 8. Build real isolation tests

- Add a PostgreSQL integration-test project and isolated test database.
- Create two tenants and prove isolation for read, aggregate, create, bulk
  create, upsert, update, delete, nested writes, relation connects, and pool
  reuse.
- Prove tenant client fails before SQL without context.
- Prove identity capability cannot read CRM data.
- Exercise portal, contract, API-key, job, event, and audit tenant routing.

## 9. Update operational documentation

Files:

- `docs/SECURITY.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`
- root READMEs where environment setup is described

Document role creation, URLs, migrations, local reset, RLS troubleshooting,
test execution, and the exact system escape hatches.

## 10. Release verification

Run sequentially:

1. clean PostgreSQL 16 startup;
2. migration deploy;
3. seed;
4. tenant integration tests;
5. unit tests;
6. lint;
7. typecheck;
8. clean production build;
9. manual two-workspace smoke test;
10. repository diff and secret scan.

Phase 1 is complete only when every acceptance criterion in the approved design
passes. Security phase 2 then starts with webhook SSRF and file-upload
hardening.
