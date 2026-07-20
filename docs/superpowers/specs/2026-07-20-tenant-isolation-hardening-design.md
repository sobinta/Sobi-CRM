# Tenant Isolation Hardening Design

**Date:** 2026-07-20  
**Status:** Approved design; implementation pending written-spec review

## Purpose

Harden SOBI CRM's tenant boundary before any production SaaS deployment. A
request, background task, public integration, or developer mistake must not be
able to read, create, connect, update, or delete data belonging to another
tenant.

The database currently contains no customer data, so this design intentionally
chooses a clean breaking migration rather than preserving the existing
fail-open runtime behavior.

## Current Risks

- The Prisma extension applies tenant filters only when a `PlatformContext`
  exists. A tenant-scoped query without context is therefore unscoped.
- Caller-supplied `tenantId` values are retained on creates instead of being
  overwritten by the active tenant.
- Prisma query extensions do not reliably protect nested writes and connects.
- `rawDb` is broadly importable and bypasses the application tenant boundary.
- PostgreSQL has no row-level security policies, so application mistakes reach
  the underlying data directly.
- Several public and system flows resolve a tenant and then perform unscoped
  writes.
- Cross-tenant isolation has no PostgreSQL integration test coverage.

## Goals

1. Make all normal tenant access fail closed when context is missing.
2. Enforce the same boundary independently in PostgreSQL with forced RLS.
3. Separate tenant, identity, and system database capabilities.
4. Ensure caller input can never select or override the active tenant.
5. Validate tenant ownership for nested relations before mutation.
6. Preserve authentication, provisioning, public intake, contracts, jobs,
   automation, notifications, audit, and webhooks through explicit flows.
7. Prove isolation against two real tenants in PostgreSQL integration tests.
8. Keep local development and future managed PostgreSQL deployment
   reproducible from migrations and documented environment variables.

## Non-goals

- Billing, quotas, metering, SSRF protection, upload hardening, and distributed
  queues are separate phases.
- Per-tenant databases or schemas are not introduced.
- Existing customer-data migration and zero-downtime compatibility are not
  required because production customer data does not exist.
- This phase does not redesign business permissions; RBAC remains an
  additional layer above tenant isolation.

## Chosen Architecture

The system uses defense in depth: application context, transaction-bound
Prisma access, PostgreSQL roles, and forced row-level security all enforce the
same tenant boundary.

### Database capabilities

Three logical clients replace general-purpose access:

- `tenantDb`: request and tenant-job access to tenant-scoped business data.
  It is usable only inside a tenant transaction.
- `identityDb`: Better Auth, session resolution, users, memberships, roles, and
  the minimum tenant metadata required to select a valid workspace. It cannot
  access CRM or other tenant business tables.
- `systemDb`: tenant discovery, initial provisioning, migrations, and the job
  dispatcher. Its import surface is restricted to an allowlist of system
  modules.

The application runtime role does not own tables and does not have
`BYPASSRLS`. A distinct migration owner creates schema objects. RLS is forced
on tenant-scoped tables so accidental ownership or role inheritance cannot
silently disable policies.

Production uses separate connection URLs for tenant, identity, system, and
migration capabilities. Local development provisions the same roles in
PostgreSQL; it does not collapse them into one privileged URL.

### Tenant transaction

`runWithTenantTransaction(context, fn)` becomes the root of every tenant data
flow:

1. Validate that the context contains a non-empty tenant and actor identity.
2. Start a Prisma interactive transaction using the tenant runtime role.
3. Execute `SELECT set_config('app.tenant_id', tenantId, true)` in that
   transaction. The third argument makes the value transaction-local.
4. Store both the immutable `PlatformContext` and transaction client in
   `AsyncLocalStorage`.
5. Execute `fn` using `tenantDb`, which delegates only to the stored transaction
   client.
6. Commit on success or roll back on any error.

No request-scoped tenant value is set at connection or pool-session level.
This prevents tenant state from leaking when pooled connections are reused.
Nested tenant transactions reuse the existing transaction only when the tenant
IDs match; a mismatched nested context throws immediately.

### Fail-closed Prisma boundary

For every model listed as tenant-scoped:

- An operation without an active tenant transaction throws
  `TenantContextRequiredError` before reaching PostgreSQL.
- Read and mutation filters always include the active `tenantId`.
- Top-level `create`, `createMany`, and `upsert` always overwrite `tenantId`
  with the active tenant, even when input contains a different value.
- The caller-facing service DTOs omit `tenantId` wherever possible.
- Global models are explicitly categorized; an uncategorized new Prisma model
  fails a metadata consistency test.

`tenantDb` is not a fallback to an unscoped client. Missing context is a
programming and security error.

### PostgreSQL RLS

Every table with a direct non-null `tenantId` receives:

```sql
ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TableName" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "TableName"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
```

The final migration will generate explicit statements for the audited model
list rather than dynamic production SQL. The migration also grants only the
required CRUD privileges to the tenant runtime role.

Tables scoped through a parent relation, such as role or team join tables, are
handled explicitly. The preferred schema change is to add a direct `tenantId`
where doing so produces a clear and enforceable invariant. Where that would
create harmful duplication, the policy uses an `EXISTS` predicate against the
RLS-protected parent and the service validates the parent before writing.

### Cross-tenant relations

Database relations that represent tenant-owned records must not accept an ID
from another tenant. Services validate optional relation IDs using tenantDb
before mutation. High-risk examples include:

- pipeline and stage on deals;
- company on contacts;
- contact, company, and deal on contracts;
- checklist items and attached business records on files;
- policy on claims;
- campaign recipients;
- task, calendar, and notification membership references;
- automation and workflow parent records.

Where practical, Prisma schemas add compound uniqueness and foreign keys that
include `tenantId`. Application validation remains necessary for polymorphic
`entityType`/`entityId` references that PostgreSQL cannot express as ordinary
foreign keys.

A relation to an inaccessible record returns not found rather than forbidden,
so the API does not reveal that an ID exists in another tenant.

## Flow-specific Design

### Authenticated requests and server actions

Session resolution uses `identityDb` to verify that the user has an active,
non-deleted membership. `withPlatformContext` and `withActionContext` then run
their callback through `runWithTenantTransaction`. Permission checks execute
inside the same immutable context.

### Public lead intake

The public gateway uses a narrowly scoped identity lookup to resolve an active
tenant from its public slug. Lead creation and event publication then run in a
tenant transaction under a synthetic `portal` actor. The public input cannot
contain a tenant ID.

### Public contracts

The gateway resolves the opaque share token to a tenant and contract ID using
a dedicated lookup capability. Viewing and acceptance then execute inside that
tenant transaction. Contract-token expiry and stronger signatures belong to a
later public-endpoint hardening phase.

### API keys

Key verification uses a dedicated lookup returning tenant ID, key ID, and
scopes. All business queries then run in the resolved tenant transaction. Scope
enforcement is implemented in the next security phase, but tenant isolation is
enforced in this phase.

### Jobs and subscribers

The system dispatcher may discover due work across tenants but must not execute
business handlers with `systemDb`. It claims a job, resolves its tenant, and
runs the handler in a tenant transaction. Automation, notifications, events,
audit records, and outbound webhook selection inherit that transaction context.

### Provisioning

Provisioning uses `systemDb` only to create the tenant, initial membership, and
baseline roles in one transaction. Subsequent feature and sample-data setup
runs through the tenant capability. The system capability is never exposed to
route handlers directly.

## Error Model

- `TenantContextRequiredError`: tenantDb was used outside a tenant
  transaction. This is logged as an application security defect.
- `TenantMismatchError`: nested context, explicit relation, or internal caller
  attempted to use a different tenant.
- `TenantDatabasePolicyError`: PostgreSQL rejected a query under RLS. SQL,
  connection details, and policy internals are not sent to clients.
- `SystemCapabilityRequiredError`: system work was attempted without an
  explicitly allowed system capability.
- Cross-tenant and missing record lookups both map to HTTP 404.
- Authentication and RBAC failures remain HTTP 401 and 403 respectively.

Security errors include request ID, tenant ID when known, operation, and model
in structured logs. They never include credentials, raw query parameters, or
customer record contents.

## Migration Strategy

1. Add model classification and database-boundary tests before behavior
   changes.
2. Introduce the three clients and tenant transaction context.
3. Convert authenticated, public, provisioning, job, and subscriber flows.
4. Remove general `rawDb` imports and enforce the allowlist with ESLint.
5. Add direct tenant keys or compound relations where required.
6. Add PostgreSQL roles, grants, forced RLS policies, and startup self-checks.
7. Recreate the local database from migrations and seed it.
8. Run isolation, application, and release verification.

Because the database has no production data, migrations may rebuild affected
constraints and development data may be reset. The committed migration remains
forward-only and reproducible on a fresh PostgreSQL instance.

## Verification

### Static checks

- Every Prisma model is classified as global, direct tenant-scoped, or scoped
  through a documented parent.
- Direct imports of removed `rawDb` fail lint except in the explicit system and
  identity boundary modules.
- Service input types do not expose tenant selection without a documented
  system use case.

### PostgreSQL integration tests

Tests create tenant A and tenant B and verify:

- reads, counts, aggregates, updates, deletes, and upserts cannot cross tenants;
- explicit foreign tenant IDs on create and createMany are overwritten or
  rejected as appropriate;
- nested create, connect, update, and disconnect cannot cross tenants;
- tenantDb without context fails before querying;
- transaction-local tenant settings do not leak through the connection pool;
- identityDb cannot read CRM tables;
- the tenant runtime role is not a table owner and has no `BYPASSRLS`;
- forced RLS remains effective under all runtime roles;
- jobs, portal intake, API keys, and contract tokens enter the correct tenant.

### Regression checks

- Existing unit tests pass.
- Lint and typecheck pass.
- A clean dependency install and production build pass.
- Fresh migrations and seed pass against PostgreSQL 16.
- Manual smoke flow: register, provision workspace, switch workspace, create
  CRM data, upload/download a file, run a job, submit a public lead, and access
  a public contract.

## Startup Self-check

Production startup queries PostgreSQL metadata and refuses readiness when:

- the tenant runtime role owns a tenant table;
- the role has `BYPASSRLS` or superuser privileges;
- a tenant table lacks enabled and forced RLS;
- an expected policy is missing;
- required database URLs resolve to an unintended privileged role.

Local development reports the same conditions as actionable errors. Tests may
use a documented isolated migration role solely for database setup.

## Acceptance Criteria

The phase is complete only when:

1. No tenant-scoped Prisma operation succeeds without a tenant transaction.
2. PostgreSQL independently blocks every tested cross-tenant operation.
3. Caller-supplied tenant IDs cannot influence normal writes.
4. Cross-tenant nested relations are rejected without record disclosure.
5. Auth, public, job, and provisioning flows use their documented capability.
6. `rawDb` is removed from general application use.
7. Role and policy self-checks pass on a fresh local database.
8. Unit, integration, lint, typecheck, migration, seed, and build checks pass.
9. Security, architecture, deployment, and testing documentation describe the
   implemented behavior rather than aspirational behavior.

## Follow-on Phases

After this phase is accepted, work proceeds in the previously agreed order:

1. webhook SSRF, upload hardening, API scopes, public abuse controls, contract
   acceptance, secrets, CSP, audit integrity, and dependency remediation;
2. Redis-backed rate limiting, durable queues/outbox, object storage, retries,
   idempotency, and observability;
3. billing, subscriptions, quotas, usage metering, and entitlements;
4. website SDK/widgets, versioned public API, inbound webhooks, OAuth, and data
   import;
5. expanded custom-data indexing, reporting, schema evolution, and field-level
   authorization tests;
6. UI accessibility, navigation state, unsaved-change protection,
   virtualization, and final production hardening.
