# Public Read-Only Demo Design

## Goal

Provide a production-safe public demo of Sobi CRM. A visitor can enter the real
workspace shell, browse representative modules, open forms, and try common UI
interactions without creating, changing, deleting, uploading, sending, or
persisting any data.

The demo must use fictional seeded data, must not expose a shared credential to
the browser, and must remain read-only even if a UI component or API route is
implemented incorrectly.

## Scope

The first release includes:

- public entry from every existing demo CTA and the login page;
- a dedicated demo identity, tenant, membership, and role;
- representative seeded records for the product modules exposed in the demo;
- read-only navigation and detail views;
- non-persistent simulations for common create/edit interactions;
- visible demo status and clear feedback that simulated changes are not saved;
- central write protection, rate limiting, short sessions, and security tests.

The demo does not include real integrations, outbound messages, AI provider
calls, file uploads/downloads, user or role administration, tenant switching,
billing, platform administration, imports, exports, background jobs, or access
to any non-demo tenant.

## Chosen Architecture

Use a dedicated demo tenant with a normal authenticated session and an explicit
read-only access mode. Read operations use the real application services and
tenant-scoped database client. UI mutations are simulated in browser memory and
never reach a persistence endpoint.

This approach is preferred over a separate static showcase because it exercises
the real workspace and navigation. It is preferred over per-visitor tenant
clones because it performs no database writes during a visitor session and does
not require cleanup jobs.

## Provisioning

An idempotent provisioning command creates or repairs the following system-owned
demo resources:

- one dedicated demo user;
- one dedicated demo tenant;
- one active membership with a dedicated demo viewer role;
- a fixed set of fictional sample records and enabled modules.

Provisioning is separate from ordinary customer seed logic and targets resources
by stable keys rather than "the first tenant". It is safe to run repeatedly.
Production deployment must run provisioning explicitly when public demo mode is
enabled.

The demo sign-in secret is generated or supplied only on the server. No demo
email/password pair is included in client source, public environment variables,
HTML, or JavaScript bundles.

## Demo Entry and Session

Public demo availability is controlled by an explicit server configuration
flag, not by `NODE_ENV`. Existing demo CTAs call one server-owned entry point.
That entry point:

1. verifies demo mode is enabled;
2. applies IP-based rate limiting;
3. resolves the provisioned demo identity on the server;
4. creates a standard Better Auth session without returning credentials;
5. redirects to the localized CRM dashboard.

Demo sessions are HttpOnly, SameSite-protected, short-lived, and renewable only
through the demo entry point. The workspace displays a persistent "Demo ·
changes are not saved" indicator and provides an obvious exit action.

## Access Mode and Write Barrier

`PlatformContext` gains an explicit access mode (`read-write` or `read-only`).
The mode is derived server-side from the dedicated demo membership/role and is
never accepted from client input.

The tenant-scoped Prisma capability blocks every mutation when access mode is
read-only, including create, update, delete, upsert, bulk mutations, and raw
write operations. The check happens before SQL. This is the final security
barrier and is independent of UI state and route-level permission checks.

Application mutation entry points also reject read-only sessions early through
the shared action/API context wrapper. This produces a controlled response and
audit-safe log instead of relying on a database exception for expected demo
behavior.

Demo permissions allow reads only for explicitly exposed product modules. Admin,
platform administration, integration configuration, tenant switching, billing,
exports, uploads, and other sensitive capabilities are absent from both the
navigation and authorization set. Background jobs skip the demo tenant.

## UI Simulation

A shared demo-mode provider exposes whether the current session is read-only. A
small simulation utility gives interactive components a consistent behavior:

- forms can be completed and validated normally;
- submitting creates a temporary client-memory item or updates the current
  in-memory view;
- temporary items carry a visible "Demo" marker;
- success feedback explicitly says the operation was simulated and not saved;
- navigation or reload discards the temporary state;
- no server action, API mutation, upload, provider call, or queue operation runs.

The first representative simulations cover creating a contact, lead, deal, and
task, editing a basic record, and moving a deal between pipeline stages. Other
mutation controls remain visible when useful for product discovery, but resolve
to a localized demo explanation instead of silently failing.

## Error Handling

- If demo mode is disabled, the entry point returns not found and demo CTAs are
  not rendered.
- If provisioning is incomplete, entry fails closed with a localized temporary
  unavailable message and a server log that contains no secret.
- If a mutation reaches the server, it receives a typed read-only rejection;
  the UI explains that demo changes are not persisted.
- Authentication and rate-limit errors do not reveal whether the demo identity
  exists.

## Security and Privacy

All demo records are fictional and belong only to the dedicated demo tenant.
The shared demo session cannot select another tenant. Tenant scoping and
PostgreSQL RLS remain active for every read.

The design uses layered enforcement:

1. read-only RBAC limits visible capabilities;
2. shared action/API guards reject mutations;
3. the Prisma tenant capability rejects all database writes;
4. PostgreSQL RLS prevents cross-tenant reads;
5. integrations, jobs, uploads, exports, and outbound side effects are disabled.

Rate limiting and short session lifetime reduce abuse. No standing credential is
shipped to the browser or repository.

## Testing

Automated coverage must include:

- idempotent provisioning and stable demo resource selection;
- successful public demo entry without client-visible credentials;
- disabled-demo and incomplete-provisioning failure paths;
- permission and navigation restrictions;
- rejection of every Prisma mutation class before SQL;
- rejection of server actions and mutation APIs for demo sessions;
- continued tenant isolation and existing RLS integration tests;
- confirmation that representative simulations never issue mutation requests;
- reload/navigation clearing temporary records;
- localized desktop and mobile demo entry and exit flows.

The release gate is zero database changes before and after a complete automated
demo walkthrough.

## Rollout

Implementation is split into two increments:

1. secure public entry, provisioning, read-only context, central write barriers,
   restricted navigation, and tests;
2. shared simulation UX and representative contact, lead, deal, and task flows.

The public demo flag remains disabled until provisioning and both security test
layers pass in the deployment environment.
