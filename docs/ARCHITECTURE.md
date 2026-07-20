# Architecture

SOBI CRM is a single Next.js application organized into four layers with a
strict, lint-enforced dependency direction: **modules → engines → core**.

## Layers

### `core/` — platform kernel
Framework-level services with **no business logic**:

- **auth / tenancy / rbac** — Better Auth sessions bound to a tenant; separate
  tenant, identity, and system database capabilities; a fail-closed Prisma
  extension plus forced PostgreSQL RLS bind every business query to the
  immutable AsyncLocalStorage `PlatformContext`. `can()` composes role grants
  → ownership → team visibility → admin override.
- **event-bus** — a typed in-process bus with a durable `Event` log. `publish()`
  persists then fans out to subscribers; failures are isolated.
- **jobs** — a DB-backed job runner (reminders, overdue scans, automation
  timers) polled by an internal tick route.
- **metadata** — the entity/field registry: built-in entities register in code
  in the same shape as runtime-created custom entities, so forms, views, search,
  and validation read one source.
- **rules** — a sandboxed JSON-AST expression evaluator + a Business Rules
  engine. One evaluator serves forms, workflow, automation, and permissions.
- **templates / versions / features / commands** — the Template Engine,
  generic draft/published/archived versioning, feature/module gating, and the
  Command Platform (⌘K).
- **observability / security / gdpr** — structured logging + health snapshot,
  AES-GCM field encryption + rate limiting, and data-subject rights.

### `engines/` — Business Engines
Reusable, tenant-scoped, permission-aware, event-emitting services that modules
compose: `crm`, `pipeline`, `booking`, `workflow`, `forms`, `documents`,
`files`, `finance`, `notifications`, `dashboards`, `reporting`, `analytics`,
`timeline`, `feed`, `graph`, `search`, `automation`, `integrations`, `ai`,
`entity-builder`, `portal`. Engines never import modules.

### `modules/` — business modules
Thin compositions of engines + a manifest (workspace, nav, permissions,
relationship kinds). Activating a module (a feature grant) surfaces its
workspace in the rail. Insurance is the fully-built reference module; the
booking engine backs the barber/salon/restaurant service modules.

### `app/` — routes
`[locale]/(auth|app|public)` route groups + `api/v1/**` REST handlers
(files, reports, GDPR export, public API, webhooks, internal jobs tick).

## Request lifecycle

1. Middleware (`proxy.ts`) negotiates the locale.
2. The authenticated `(app)` layout resolves the session, builds a
   `PlatformContext`, and composes the workspace rail from activated modules.
3. Server components / actions run inside `withPlatformContext`/
   `withActionContext`, which set the AsyncLocalStorage context so the scoped
   `db` client, transaction-local RLS setting, and `can()` apply automatically.
4. Services mutate, then `publish()` events + `record()` audit entries; the bus
   drives Timeline, Feed, Automation, Notifications, and Integrations.

Public gateways and cross-tenant dispatchers may use the allowlisted system
capability only to resolve a tenant/work item. They execute business logic
inside that tenant's context. ESLint prevents new system/identity client
imports outside the reviewed boundary files.

## Metadata-driven, low-code

The Metadata Kernel + builders (Form, Workflow, Entity, Dashboard, Automation,
Rules) let business admins configure the platform without code. Custom entities
store records in a generic `CustomRecord` table and inherit CRUD, views, search,
and timeline. See [METADATA.md](METADATA.md).
