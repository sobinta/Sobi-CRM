# Sobi CRM Experience Expansion Design

**Status:** Approved design, pending written implementation plan  
**Date:** 2026-07-21  
**Reference archive:** `SOBI-Desk-design-reference-for-Sobinta-20260721.zip`  
**Reference SHA-256:** `B2C7FE1EE43AC419424C4B344038FC33D2DB77246357C5CDCC243E3DA1064ECF`

## 1. Objective

Turn the current Sobi CRM workspace into a polished, coherent Sobinta product
without replacing its identity or duplicating product areas. The work improves
the entry dashboard, shell, onboarding, calendar, form system, subscription
identity, and customer support while preserving the dark Sobi CRM rail,
viridian brand palette, existing security boundaries, and tenant-scoped data
model.

The approved delivery approach is incremental vertical slices. Each slice must
include its UI, persistence, authorization, localization, demo behavior, tests,
and a dedicated commit before the next high-risk slice begins.

## 2. Reference boundary

The supplied Sobi Desk archive is a visual and interaction reference. It
contains a static fake-data shell, design tokens, navigation contracts, a
universal field pattern, and accessibility guidance. It does not contain a
production tour, dual-calendar engine, form-builder backend, ticket system,
live-chat transport, billing enforcement, data model, or security design.

Sobi CRM adopts these reference characteristics:

- calm and information-dense operational composition;
- 210/72-pixel two-state rail behavior;
- compact controls and restrained card framing;
- persistent form labels and explicit interaction states;
- direction-aware icons, accessible names, and reduced-motion behavior;
- user and utility content at the bottom of the rail;
- a subtle discoverability pulse reserved for the compact rail control.

Sobi CRM retains its own:

- logo, product name, dark rail, viridian/green palette, and navigation model;
- routes and CRM-specific information architecture;
- authentication, authorization, tenancy, RLS, persistence, and audit design;
- production data and domain workflows.

No runtime, credential, endpoint, or backend implementation is copied from the
reference archive.

## 3. Approved scope and sequence

| Phase | Deliverable | Risk |
| --- | --- | --- |
| 0 | Git restore point, database baseline, and verification baseline | Low |
| 1 | Restrained card glow, compact-rail pulse, green canvas, dark theme, user/plan utility | Low to medium |
| 2 | Merge management dashboard into `/crm`, command-center layout, charts, explicit customization mode | Medium |
| 3 | Versioned first-run product tour with replay | Medium |
| 4 | Gregorian/Jalali calendar, unified sources, search, events, and reminders | High |
| 5 | Tenant field extensions and universal versioned form builder | Very high |
| 6 | Tickets, super-admin inbox, notifications, and plan-gated live chat | Very high |
| 7 | Security, localization, browser, accessibility, performance, and visual quality audit | High |

Every phase must leave the application usable and independently reversible.
No phase may weaken the public read-only demo boundary.

## 4. Shared visual foundation

### 4.1 Workspace canvas

The light workspace canvas changes from cream to a very light, low-chroma
green derived from the Sobi CRM brand. Cards remain solid, readable surfaces
with one border and one hierarchy. The canvas must not become saturated or
make data cards appear tinted.

Dark mode uses charcoal and deep green-black surfaces with distinct elevation,
readable cool-neutral text, and brand-compatible green focus and selection
states. Semantic success, warning, and danger colors remain semantic and are
not repurposed as decoration.

### 4.2 Dashboard card interaction

Dashboard hover/focus treatment is limited to a narrow brand-colored border
glow. It must not add a wide halo, large shadow, translation, scaling, or text
obscuration. Keyboard focus remains stronger and independently identifiable.

The glow color is derived from the active tenant brand token. It must remain
compatible with custom tenant branding rather than introducing a fixed neon
hue.

### 4.3 Compact rail pulse

The collapse/expand control receives a single subtle ring animation only while
the desktop rail is compact. The animation is slow, low-opacity, and uses the
brand/focus token. Hover or focus may strengthen the ring slightly.

The animation stops when the rail expands and is disabled under
`prefers-reduced-motion: reduce`.

Chevron direction remains:

| Direction | Expanded | Compact |
| --- | --- | --- |
| LTR | points left | points right |
| RTL | points right | points left |

### 4.4 User, profile, plan, and upgrade utility

The bottom of the rail contains a non-module user utility showing:

- avatar or initials;
- user name and profile entry;
- active tenant plan name;
- an upgrade action when a higher plan is available.

Compact mode shows the avatar and accessible localized tooltip. Plan data comes
from `TenantSubscription` and `PricingPlan`; it is not hard-coded. Upgrade opens
an in-app plan comparison and the existing commercial next step. The read-only
demo displays its demo plan without initiating billing or persistence.

## 5. Dashboard and information architecture consolidation

### 5.1 Remove the duplicate management dashboard

The current `/mgmt` dashboard and the `/crm` entry dashboard substantially
duplicate KPI, pipeline, task, and activity content. The approved decision is
to remove `management` as a top-level rail workspace and make `/crm` the single
command center shown after ordinary sign-in.

The non-duplicate management destinations remain available:

- reports move into the CRM contextual navigation;
- activity feed moves into the CRM contextual navigation;
- `/mgmt` redirects to `/crm` so existing bookmarks do not fail;
- legacy `/mgmt/reports` and `/mgmt/feed` receive stable redirects or canonical
  CRM destinations after their route behavior is verified.

### 5.2 Approved command-center layout

The selected visual direction is the balanced command center (Option A):

1. localized header, workspace context, support access, and quick actions;
2. one row of four primary KPIs;
3. a wide sales/performance trend panel;
4. a narrower action column containing manager attention items and a pipeline
   composition chart;
5. team workload and key tasks;
6. recent activity and upcoming dated work.

The wide desktop layout prioritizes trend and action. Tablet uses two columns.
Mobile uses one semantic column in the same priority as the DOM.

### 5.3 Charts and accessibility

The dashboard adds real-data bar and doughnut charts using the existing
analytics services and `recharts`. Charts use Sobi CRM brand-compatible colors,
localized formatting, tooltips, legends, and text/table summaries. They remain
understandable without color and in dark mode.

No chart may require transferring entire tenant record sets to the browser.
Server aggregation returns only the necessary series.

### 5.4 Explicit customization mode

The default dashboard is stable and professionally composed. Drag, resize,
add, and remove behavior activates only after the user enters a separate
"Customize dashboard" mode.

Layout storage is direction-neutral. RTL/LTR changes presentation rather than
stored business coordinates. Cancelling customization restores the last saved
layout. Saving validates allowed widget types, dimensions, and identifiers on
the server. Read-only demo customization is browser-only.

### 5.5 Failure isolation

Each data panel has a bounded loading, empty, restricted, and error state. A
failure in one aggregate does not blank the entire dashboard. Authorization
failure never reveals hidden counts or record existence.

## 6. Versioned first-run product tour

The first visit to the CRM workspace starts a localized, multi-step tour. The
initial tour covers:

1. module rail and compact behavior;
2. contextual CRM navigation;
3. global search and quick creation;
4. dashboard KPIs and manager attention area;
5. calendar entry;
6. form customization entry for authorized users;
7. support center and profile/plan utility.

The tour uses a dimmed overlay, a clear spotlight, short text, step count,
Back, Next, Skip, and Finish. It supports Escape, keyboard focus, viewport
scrolling, responsive placement, and focus restoration. Target removal or
permission differences skip the unavailable step safely.

Progress is versioned per membership and tenant so a changed tour can be shown
once after a meaningful release. Completion is stored server-side for normal
users and in browser storage for the write-protected public demo. A Help action
allows replay at any time. Reduced-motion mode removes non-essential travel
animations.

## 7. Unified Gregorian and Jalali calendar

### 7.1 Canonical date model

Business timestamps remain canonical Gregorian UTC values in persistence and
APIs. Jalali values are an input and presentation concern. Conversion uses the
existing `jalaali-js` dependency behind a small tested date adapter.

Tenant/user timezone is applied consistently at range boundaries. Month
queries use explicit inclusive/exclusive UTC boundaries derived from the
visible local month.

### 7.2 Calendar modes

The calendar has two explicit modes:

- Jalali mode: Saturday is the first weekday, month/year are Jalali, and each
  day shows its Gregorian date in small secondary text;
- Gregorian mode: Monday is the first weekday, month/year are Gregorian, and
  each day shows its Jalali date in small secondary text.

Both modes provide previous/next month, month/year selection, a Today action,
and direct navigation to a chosen date. Today, out-of-month days, selected
days, and days with events are distinguishable without color alone.

### 7.3 Calendar sources

The calendar is a unified read model, not a table of copied dates. It combines
authorized range results from:

- `CalendarEvent.startAt/endAt`;
- `Task.dueAt`, including follow-ups;
- `Deal.expectedCloseAt` and `Deal.closedAt`;
- campaign scheduling and send dates;
- `Policy.startAt/expiresAt`;
- `Contract.startDate` and calculated or explicit expiry where available.

Campaigns gain explicit schedule start/end fields because the current model
only contains `sentAt`. Contract expiry is represented explicitly when a
machine-readable value is required; a free-text duration label is not parsed
as authority.

Every item carries a source, source identifier, tone, status, permitted link,
and date interval. Opening an aggregated item re-checks access at the source
record.

### 7.4 Events and reminders

Users with permission can create and edit an event with title, description,
type, all-day state, start/end, location, owner, related record, tone, custom
fields, and one or more reminder offsets.

Reminders are durable records scheduled through the existing Job and
Notification engines. Re-scheduling or deleting an event updates pending jobs
idempotently. Delivery begins with in-app notification and leaves an extension
boundary for email without making email a prerequisite for acceptance.

### 7.5 Search

Advanced calendar search supports:

- from/to range;
- free text;
- source and event type;
- status;
- owner;
- with or without reminders.

Results appear in a compact list and can move the calendar to the matching
date. Queries are range-bounded, indexed, tenant-scoped, permission-aware, and
paginated where necessary.

### 7.6 Demo behavior

The public demo allows event creation, editing, reminders, filters, and date
navigation as a client-only simulation. No event, reminder, job, notification,
or audit row is persisted.

## 8. Universal tenant form builder

### 8.1 Scope boundary

The builder applies to business-data forms: contact, company, lead, deal,
task, calendar event, contract, policy/insurance, campaign, and custom
entities. Authentication, security settings, billing, and other sensitive
system forms are not tenant-customizable.

Every supported form exposes a localized "Customize form" entry only to users
with the management permission. It opens the shared Studio builder rather than
forking a page-specific builder.

### 8.2 Tenant metadata extensions

The current registry returns code-defined built-ins before tenant definitions,
which prevents real tenant extension. The revised registry resolves a built-in
base and merges an explicitly marked tenant extension with deterministic
precedence.

System fields retain immutable keys and types. Tenant fields receive stable,
collision-safe keys. The merged metadata is the source used by form loading,
rendering, search, validation, APIs, and persistence.

Supported built-in models store added values in a `customFields` JSON object.
Models that do not yet contain it receive a non-destructive default-empty JSON
column. Custom entities continue using `CustomRecord.data`.

### 8.3 Field definition capabilities

Authorized managers can create fields of these existing metadata types:

- text, textarea, number, currency, boolean;
- date and datetime;
- select and multiselect;
- email, phone, and URL;
- relation and user.

Each field supports localized labels, placeholder/example, help text, default,
requiredness, min/max validation, options, searchability, conditional
visibility, and a calculated expression where safe.

The builder provides a field palette, section canvas, ordering controls,
width, field configuration, conditional rules, and live preview in Persian,
English, and German. Persistent labels and actionable validation errors follow
the reference component contract.

### 8.4 Draft, publish, rollback, and deletion safety

Form configuration uses the existing `ConfigVersion` mechanism with draft,
preview, publish, history, and rollback behavior. Published forms are what
ordinary users render.

A field with values is archived before it can be destructively removed.
Archiving hides it from new input while preserving historical JSON values.
Permanent deletion requires an explicit impact check and is not part of the
normal form editing flow.

### 8.5 Server enforcement

Client rendering is not a security boundary. Server Actions resolve the same
published metadata, reject unknown fields, validate types/ranges/options, omit
computed/system fields from user mutation, and authorize the underlying
entity operation.

Demo form and field changes remain browser-only and cannot publish a
`ConfigVersion` or mutate a business record.

## 9. Support center and plan-gated live chat

### 9.1 Customer support center

The top bar exposes a localized support center with:

- the user's tickets;
- a new-ticket flow;
- threaded ticket messages and unread state;
- a live-chat tab.

Tickets include subject, category, priority, status, requester, tenant,
assignment, timestamps, and a message thread. Responses create in-app
notifications through the existing notification engine.

### 9.2 Super-admin inbox

Platform Admin gains a support inbox with tenant, status, priority, assignment,
and age filters. Authorized super admins can assign, reply, close, and reopen.

Cross-tenant access is isolated in a dedicated support service using the
system capability and `requireSuperAdmin`. It is not exposed through normal
tenant database access. Ticket/message reads and mutations create audit events
that identify the actor and affected ticket without logging message bodies.

### 9.3 Live chat

Live chat uses the same durable conversation model with real-time delivery,
operator presence, typing indication, and expected wait status. Server-sent
events deliver updates to the customer, normal authenticated requests send
messages, and Redis Pub/Sub coordinates instances. Controlled polling provides
a fallback if the stream is unavailable.

The connection and message protocol must tolerate reconnection and duplicate
delivery by using durable message IDs and idempotent client reconciliation.

### 9.4 Entitlement enforcement

The existing pricing entitlement system gains `support.live_chat`. Ordinary
ticket messaging remains available according to product policy; live chat is
enabled for selected professional plans.

The entitlement is checked server-side when opening a stream, sending a live
message, exposing presence, and using super-admin live-chat actions. Hiding a
tab in the browser is not sufficient enforcement. Subscription expiry,
past-due state, cancellation, and plan change take effect through the existing
entitlement snapshot rules.

### 9.5 Abuse, privacy, and demo safety

Ticket and message inputs are length-limited, validated, origin/session
checked, and rate-limited. Message bodies and customer-provided sensitive data
do not enter application logs. The first accepted release does not introduce
unbounded file attachments.

The public demo simulates ticket and chat UX locally. It does not contact a
real operator, create tickets, open Redis streams, write notifications, or
consume plan resources.

## 10. Localization, direction, and accessibility

All changed surfaces are complete in Persian, English, and German. No English
fallback appears on Persian calendar, dashboard, form builder, profile/plan,
tour, ticket, or chat surfaces.

The implementation uses logical CSS properties, localized `Intl` formatting,
tabular numerals for metrics/dates, direction isolation for mixed content, and
directional mirroring only for semantic arrows.

Acceptance includes:

- semantic headings and landmarks;
- visible keyboard focus;
- 44-pixel minimum interactive targets;
- accessible dialog and popover names;
- focus trap/restoration where modal behavior is used;
- chart text equivalents;
- live-region use limited to relevant async feedback;
- zoom, narrow viewport, dark mode, and reduced-motion checks.

## 11. Data migrations and tenant isolation

New tenant-scoped support, reminder, tour-progress, and extension data receives:

- explicit `tenantId` where the model is tenant-owned;
- model metadata registration in the tenant query guard;
- PostgreSQL RLS policies consistent with existing tenant tables;
- same-tenant reference triggers for cross-model foreign keys;
- compound indexes for tenant/range/status access patterns;
- negative tests proving cross-tenant reads and writes fail.

The support super-admin capability is explicitly allowlisted and audited.
Normal tenant code cannot query another tenant by supplying an identifier.

Migrations are additive before destructive cleanup. Existing values remain
readable, current actions continue working, and rollback behavior is documented
for every schema phase.

## 12. Error and resilience behavior

- Dashboard panel errors are isolated and retryable where safe.
- Invalid date input preserves user input and explains the correction.
- Calendar source failure identifies the unavailable source without exposing
  restricted counts.
- Reminder scheduling is idempotent and recoverable through the job runner.
- Form validation returns field-scoped errors; failed publication retains the
  draft.
- Ticket send failure retains the composed message for retry.
- Live-chat disconnect changes status visibly, reconnects with backoff, and
  reconciles missed messages from durable storage.
- Entitlement denial explains the plan requirement without revealing platform
  internals.

Unexpected server errors follow existing observability paths with secrets,
message bodies, tokens, and personal data excluded.

## 13. Verification checklist

### 13.1 Static and automated

- [ ] Next.js implementation follows the relevant local 16.2.10 documentation.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Unit and integration tests pass.
- [ ] RLS and negative tenant-isolation tests pass.
- [ ] Production build passes.
- [ ] Dependency audit reports no unresolved production vulnerability.

### 13.2 Dashboard and shell

- [ ] Hover/focus glow is confined to the card border.
- [ ] Compact-only pulse is subtle and disabled for reduced motion.
- [ ] All four RTL/LTR rail chevron states are correct.
- [ ] Light canvas is low-chroma green and dark mode is brand-compatible.
- [ ] User, profile, plan, and upgrade content works expanded and compact.
- [ ] Management rail item is removed and old routes resolve safely.
- [ ] Command-center layout is stable before customization begins.
- [ ] Charts have localized text equivalents and responsive states.

### 13.3 Tour

- [ ] First eligible visit starts the correct version once per membership/tenant.
- [ ] Back, Next, Skip, Finish, Escape, replay, focus, and scroll behavior work.
- [ ] Missing or unauthorized targets are skipped safely.
- [ ] Demo completion causes no database mutation.

### 13.4 Calendar

- [ ] Jalali month boundaries and leap years are covered by unit tests.
- [ ] Jalali weeks start Saturday; Gregorian weeks start Monday.
- [ ] Every visible day shows the correct alternate-calendar date.
- [ ] Previous, next, Today, direct date, and mode switching are correct.
- [ ] All approved source types appear only when authorized.
- [ ] Range/text/source/type/status/owner/reminder search combinations work.
- [ ] Event and reminder mutations schedule or cancel jobs idempotently.
- [ ] Demo interactions leave event, reminder, job, notification, and audit
      table counts unchanged.

### 13.5 Forms

- [ ] All approved business entities resolve tenant field extensions.
- [ ] New fields render, validate, persist, search, and localize correctly.
- [ ] System fields cannot be mutated through builder or crafted requests.
- [ ] Draft, preview, publish, history, rollback, and archive behavior work.
- [ ] Existing record data remains readable after form changes.
- [ ] Demo builder changes create no metadata, version, or record rows.

### 13.6 Support and chat

- [ ] Ticket creation, reply, assignment, close/reopen, and unread state work.
- [ ] Super-admin support access is audited and normal cross-tenant access fails.
- [ ] Live chat is denied without `support.live_chat` at every server boundary.
- [ ] Presence, typing, reconnect, missed-message reconciliation, and polling
      fallback work.
- [ ] Rate limiting and input limits are tested.
- [ ] Demo support creates no ticket, message, stream, notification, or audit row.

### 13.7 Browser and visual quality

- [ ] Persian RTL, English LTR, and German LTR are checked.
- [ ] Light/dark, desktop/tablet/mobile, keyboard-only, zoom, and reduced-motion
      variants are checked.
- [ ] Loading, empty, error, restricted, long-label, zero-count, and large-count
      states are checked.
- [ ] Desktop and mobile screenshots are compared against the approved Option A
      composition and the supplied reference contracts.
- [ ] Manual review confirms the output is visually coherent, not merely test-passing.

## 14. Restore and commit strategy

Before product files or migrations change, create an annotated Git restore tag
at the current clean commit and record database migration status and row-count
baselines relevant to demo safety.

Implementation uses one focused commit per phase. Schema and RLS changes are
committed with their tests. No unrelated user changes are included. If a phase
fails quality review, it can be reverted independently without discarding
previous accepted phases.

## 15. Explicit non-goals

- copying the Sobi Desk backend or its product-specific blue identity;
- making authentication, security, or billing forms tenant-customizable;
- parsing free-text contract duration as a reliable expiry date;
- adding unbounded support attachments in the first accepted release;
- creating duplicate calendar-event rows for tasks, deals, campaigns,
  contracts, or policies;
- replacing existing authentication, tenancy, RLS, audit, notification, job,
  billing, or demo boundaries;
- preserving the duplicate top-level management dashboard after consolidation.

## 16. Approved decisions summary

- Incremental vertical slices are mandatory.
- The balanced command-center layout (Option A) is the dashboard direction.
- `/crm` is the single entry dashboard; the duplicate management module is
  removed while reports and activity feed are preserved.
- Form customization covers business-data forms, not sensitive system forms.
- Calendar includes tasks/follow-ups, events, deals, campaigns, contracts, and
  insurance dates from the first release.
- Ticket messaging is generally available; live support chat is implemented
  now and plan-gated for selected professional tiers.
- Shell identity remains recognizably Sobi CRM while using the shared Sobinta
  interaction language.
