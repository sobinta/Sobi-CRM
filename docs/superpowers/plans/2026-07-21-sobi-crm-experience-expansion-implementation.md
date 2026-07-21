# Sobi CRM Experience Expansion Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-21-sobi-crm-experience-expansion-design.md`  
**Restore tag:** `pre-crm-experience-expansion-2026-07-21`  
**Starting commit:** `3c29e75`  
**Delivery mode:** incremental vertical slices

## Baseline

- PostgreSQL, Redis, Mailpit, and MinIO containers are running.
- Prisma reports 21 migrations and an up-to-date local database.
- Baseline counts before product changes:
  - tenants: 2;
  - calendar events: 0;
  - tasks: 2;
  - deals: 11;
  - campaigns: 1;
  - contracts: 1;
  - policies: 0;
  - config versions: 0;
  - jobs: 2;
  - notifications: 0;
  - audit logs: 0.
- The approved visual direction is Option A: balanced command center.
- `frontend-design` and `ui-ux-pro-max` govern all changed UI. The generated
  recommendation "Data-Dense Dashboard" is adopted, while its blue palette is
  rejected in favor of existing Sobi CRM brand tokens.

## Phase 1 — Shell polish, theme, and account utility

### 1.1 Token and interaction corrections

- Update `src/styles/tokens.css` so the application canvas uses a low-chroma
  green brand-derived surface in light mode and deep green-charcoal surfaces
  in dark mode.
- Replace the current broad `dashboard-glow-card` shadow in
  `src/app/globals.css` with a narrow border-only brand glow.
- Add compact-only rail pulse keyframes and reduced-motion override.
- Update `src/components/layout/module-rail.tsx` to apply the pulse only to the
  collapsed desktop control without changing its existing direction helper.
- Extend `src/components/layout/rail-direction.test.ts` if the control contract
  changes.

### 1.2 Subscription-aware user utility

- Add a server-side subscription summary service that uses the existing
  `TenantSubscription`/`PricingPlan` entitlement snapshot without accepting a
  client tenant identifier.
- Extend `SessionUser` with serializable plan identity and optional upgrade
  availability.
- Load the summary in `src/app/[locale]/(app)/layout.tsx` under trusted tenant
  context.
- Add a focused rail footer component with profile, plan, and upgrade entry;
  compact mode renders avatar plus localized tooltip.
- Add an in-app profile route and plan-comparison/upgrade destination using
  existing pricing data. No payment provider is invented.
- Add Persian, English, and German strings.

### 1.3 Phase verification and commit

- Unit-test plan summary fallback and rail direction/pulse state.
- Run lint, typecheck, focused tests, and browser smoke checks in light/dark,
  RTL/LTR, expanded/compact, reduced motion, 375/768/1440 widths.
- Capture screenshots and perform one visual subtraction pass.
- Commit as one shell/account phase.

## Phase 2 — Single command-center dashboard

### 2.1 Information architecture consolidation

- Remove the `management` top-level workspace from
  `src/core/module-registry/workspaces.ts`.
- Add Reports and Activity destinations to the CRM contextual navigation.
- Make `/[locale]/mgmt` redirect to `/[locale]/crm` with localized navigation.
- Move or redirect `/mgmt/reports` and `/mgmt/feed` to canonical CRM routes.
- Add route/navigation tests proving no capability is lost and old links remain
  safe.

### 2.2 Dashboard data contract

- Extend `src/engines/crm/crm-dashboard-service.ts` with compact chart series,
  manager-attention items, team workload, and bounded source errors.
- Reuse analytics, tasks, feed, deals, and calendar services rather than
  duplicating stores.
- Return only tenant-scoped and permission-authorized aggregate fields.
- Add unit tests for empty, restricted, multi-currency, and partial data states.

### 2.3 Option A dashboard implementation

- Split `src/app/[locale]/(app)/crm/crm-dashboard.tsx` into focused server
  sections and small client chart islands.
- Add accessible bar and doughnut chart components using `recharts`, localized
  formatting, visible legends/tooltips, and text/table summaries.
- Implement the approved wide trend + action-column layout and responsive
  tablet/mobile order.
- Add per-panel loading, empty, restricted, and error states.
- Update `loading.tsx` to match final geometry and avoid layout shift.

### 2.4 Explicit customization mode

- Reuse the safe parts of the current dashboard layout engine behind a
  separate "Customize dashboard" client boundary.
- Keep the default view pure CSS Grid; mount drag/resize only while editing.
- Normalize persisted positions independently of document direction.
- Validate widget types and dimensions in the Server Action.
- In read-only demo sessions, store customization only in browser memory.

### 2.5 Phase verification and commit

- Test navigation redirects, authorization, aggregate contracts, layout
  normalization, and read-only mutation blocking.
- Browser-test populated/empty/restricted states, three locales, themes,
  keyboard, responsive widths, and chart summaries.
- Capture desktop/mobile screenshots, critique against Option A, remove one
  unnecessary decoration, then commit.

## Phase 3 — Versioned onboarding tour

### 3.1 Persistence and service

- Add a tenant/membership-scoped versioned tour-progress model and migration.
- Register it in tenant model metadata and add RLS/same-tenant constraints.
- Add read/complete/reset service operations with explicit permissions and
  audit policy.
- Public demo progress remains client-only and never calls a mutation.

### 3.2 Accessible tour client

- Add stable `data-tour` targets to the rail, contextual row, search, dashboard,
  calendar link, form entry, support entry, and profile utility.
- Build one focused client provider with target measurement, viewport scroll,
  Back/Next/Skip/Finish, Escape, focus trap/restoration, missing-target skip,
  locale/direction positioning, and reduced motion.
- Add replay in the Help/support utility.
- Do not convert the whole application layout into a client component.

### 3.3 Verification and commit

- Unit-test progress versioning, demo storage, missing/unauthorized targets, and
  direction-aware placement.
- Add RLS negative tests and Playwright keyboard/responsive/replay scenarios.
- Run static checks/build and commit.

## Phase 4 — Unified Gregorian/Jalali calendar

### 4.1 Read the local Next.js data mutation, forms, and route-handler guides

- Before implementation, read the installed 16.2.10 documentation for data
  fetching, mutations, route handlers, forms, error handling, and data
  security.

### 4.2 Schema and RLS

- Add durable event reminders and any explicit contract/campaign scheduling
  fields approved by the design.
- Add `customFields` where required by both calendar and form phases.
- Add indexes, tenant metadata, RLS policies, and same-tenant reference
  triggers.
- Add an additive migration and integration tests before UI work.

### 4.3 Calendar date adapter and unified sources

- Add a small, pure calendar adapter around `jalaali-js` for conversions,
  visible month grids, leap years, Saturday/Monday starts, alternate dates, and
  timezone-safe UTC boundaries.
- Add source adapters for events, tasks/follow-ups, deals, campaigns,
  contracts, and policies.
- Each adapter checks the source permission and returns a shared lightweight
  calendar item; no source record is copied into `CalendarEvent`.
- Add range/search pagination and source failure isolation.

### 4.4 Calendar UI and mutations

- Replace the current static month server rendering with a server data shell
  plus focused client calendar interaction.
- Add Jalali/Gregorian switch, previous/next, month/year selection, Today,
  direct-date navigation, alternate-day labels, accessible day buttons, and a
  compact agenda.
- Add advanced search for range, text, source, type, status, owner, and reminder
  state.
- Expand event creation/editing with all-day, times, location, owner, related
  record, tone, custom fields, and multiple reminder offsets.
- Reminder mutations schedule/cancel jobs idempotently.
- Demo creation/edit/search/reminder behavior is memory-only.

### 4.5 Verification and commit

- Cover conversions, Nowruz/leap boundaries, week starts, UTC boundaries,
  alternate labels, source permissions, search combinations, reminder
  idempotency, RLS, and crafted mutation denial.
- Compare relevant demo table counts before/after browser interactions.
- Browser-test three locales, both calendar modes, responsive states, keyboard,
  dark mode, and reduced motion; then commit.

## Phase 5 — Universal tenant form builder

### 5.1 Tenant metadata extension model

- Make built-in metadata resolvable as a base plus an explicitly marked tenant
  extension.
- Preserve immutable system keys/types and deterministic collision rules.
- Add service tests proving no cross-tenant extension leakage.
- Ensure every approved built-in business model has additive `customFields`
  storage and tenant/RLS coverage.

### 5.2 Builder and version workflow

- Extend the existing Studio form builder with field creation, localized
  labels, all approved field types, validation, defaults, options,
  searchability, conditional visibility, calculation, section ordering, and
  three-locale preview.
- Add Draft, Preview, Publish, History, Rollback, and Archive flows on top of
  existing `ConfigVersion` primitives.
- Block unsafe system-field mutation and destructive removal of populated
  fields.
- Add a shared authorized "Customize form" entry to every approved business
  form.

### 5.3 Rendering, persistence, and server validation

- Route supported create/edit forms through the shared published form
  definition and dynamic field renderer without removing domain-specific
  behavior.
- Validate submitted custom fields from published metadata on the server;
  reject unknown, computed, system, invalid option, and wrong-type values.
- Persist approved values to `customFields`/`CustomRecord.data`.
- Keep demo create/build/publish flows browser-only.

### 5.4 Verification and commit

- Test all field types, localization, conditions, calculated values, archive,
  rollback, validation errors, crafted payloads, permissions, tenant isolation,
  and existing-data readability.
- Browser-test contact, deal, task, event, contract, policy, campaign, and
  custom-entity forms in three locales and mobile/desktop.
- Run static/build/RLS checks and commit.

## Phase 6 — Support tickets and plan-gated live chat

### 6.1 Read the local Next.js security/route docs and define transport boundaries

- Re-read the installed route-handler, authentication, backend-for-frontend,
  data-security, and error-handling guides before adding endpoints.

### 6.2 Schema, RLS, and service boundary

- Add tenant-scoped ticket/message models and explicit assignment/status/read
  fields.
- Add indexes, tenant metadata, RLS, same-tenant constraints, and audit tests.
- Add a dedicated super-admin support service using `systemDb` only after
  `requireSuperAdmin`; normal tenant services never accept a tenant override.

### 6.3 Customer and operator UI

- Add a topbar support entry with ticket list, new ticket, message thread,
  unread state, retry-preserving composer, and live-chat tab.
- Add Platform Admin support inbox with tenant/status/priority/assignee/age
  filters, assignment, reply, close, and reopen.
- Add notification events without logging message bodies.

### 6.4 Real-time transport and entitlement

- Add authenticated SSE delivery, message POST, Redis Pub/Sub coordination,
  operator presence/typing, reconnect/backoff, durable message reconciliation,
  and controlled polling fallback.
- Introduce `support.live_chat` in selected pricing entitlements.
- Enforce entitlement on stream open, send, presence, typing, and operator live
  actions; UI hiding is secondary.
- Add origin/session checks, input limits, and per-user/tenant rate limiting.
- Demo support is client-only and opens no Redis stream.

### 6.5 Verification and commit

- Test ticket lifecycle, unread state, assignment, cross-tenant denial,
  super-admin audit, entitlement transitions, duplicate delivery, reconnect,
  polling fallback, rate limits, and log redaction.
- Browser-test customer/operator flows and demo non-persistence; run full static,
  RLS, build, and dependency checks; then commit.

## Phase 7 — Final product audit

- Invoke the UI review guidelines for changed surfaces.
- Run the complete unit suite, RLS suite, lint, typecheck, production build, and
  dependency audit.
- Run browser matrices for Persian/English/German; RTL/LTR; light/dark;
  expanded/compact; keyboard; reduced motion; 375, 768, 1024, and 1440 pixels.
- Verify long labels, empty/zero/large values, permission restrictions, partial
  errors, disconnects, and demo no-write invariants.
- Capture final dashboard, calendar, form builder, ticket, live chat, and mobile
  screenshots.
- Compare against the approved Option A and Sobi reference contracts, document
  remaining limitations, and perform a final visual subtraction pass.
- Commit only necessary QA fixes and provide the local preview URL and restore
  instructions.
