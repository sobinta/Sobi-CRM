# SOBI CRM — a modular Business Operating System

🌐 **Language:** **English** · [Deutsch](README.de.md) · [فارسی](README.fa.md)

SOBI CRM is a multi-tenant, metadata-driven, AI-native **Business Operating
System**. CRM is its flagship capability, built on a shared platform where
each tenant activates only the industry modules relevant to their business.

It is not a demo — it is a real, commercial-grade foundation: strong security
and GDPR posture, low-code configurability (form / workflow / entity /
dashboard builders), an automation engine, an integration layer, and an AI
Operating System with a human-approval gate.

> **Maintenance note:** this README is the single source of truth for "what
> does SOBI CRM do." Whenever a new feature is added to the project, add it
> here (in all three language files) — don't let the feature list drift out
> of date.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Stack](#stack)
3. [Feature catalogue](#feature-catalogue)
   - [Platform & multi-tenancy](#platform--multi-tenancy)
   - [Authentication & access](#authentication--access)
   - [Platform administration](#platform-administration)
   - [CRM core](#crm-core)
   - [Lead conversion & AI scoring](#lead-conversion--ai-scoring)
   - [AI Operating System](#ai-operating-system)
   - [Contracts](#contracts)
   - [Email campaigns](#email-campaigns)
   - [Knowledge base & AI content suggestions](#knowledge-base--ai-content-suggestions)
   - [Reports & insights](#reports--insights)
   - [Forms engine](#forms-engine)
   - [Files, tasks, calendar, notifications](#files-tasks-calendar-notifications)
   - [Dashboards](#dashboards)
   - [Workflow builder & automation](#workflow-builder--automation)
   - [Integrations](#integrations)
   - [Industry modules](#industry-modules)
   - [Low-code studio](#low-code-studio)
   - [Security, audit & GDPR](#security-audit--gdpr)
   - [Marketing landing page](#marketing-landing-page)
   - [Branding & internationalization](#branding--internationalization)
   - [Demo mode](#demo-mode)
4. [Architecture at a glance](#architecture-at-a-glance)
5. [Scripts](#scripts)
6. [Deployment](#deployment)
7. [Docs](#docs)

---

## Quick start

```bash
# 1. Start Postgres + Mailpit
docker compose up -d

# 2. Configure env
cp .env.example .env      # dev secrets are pre-generated; adjust if needed

# 3. Install, migrate, seed
npm install
npx prisma migrate dev
npm run db:seed           # attaches demo CRM data to your first workspace

# 4. Run
npm run dev               # http://localhost:3000
```

Visit `/` for the marketing landing page, or go straight to `/en/register`
to create a workspace. In development, the login page also offers a
one-click **"Continue with demo workspace"** button (see
[Demo mode](#demo-mode)).

> **Ports:** Postgres is mapped to **5433** in `docker-compose.yml` (adjust
> `DATABASE_URL` if you change it). Mailpit uses 1025 (SMTP) / 8025 (web).

## Stack

- **Next.js 16** (App Router, RSC) + TypeScript strict
- **PostgreSQL 16** + **Prisma 7** (multi-file schema, driver adapter —
  `@prisma/adapter-pg`)
- **Better Auth** (email/password, DB sessions) + a custom tenant / RBAC layer
- **Tailwind CSS v4** + a custom OKLCH design system (not a stock template)
- TanStack-style data tables, **dnd-kit** Kanban, **React Flow** graph,
  **react-grid-layout** dashboards, **Recharts**, **cmdk** command palette
- **next-intl** i18n — English, German, and Persian (full RTL, Vazirmatn font)
- **Manrope + DM Sans** typography for the public marketing site (Vazirmatn
  for Persian, matching the rest of the app)

---

## Feature catalogue

### Platform & multi-tenancy

- **Defense-in-depth multi-tenancy** — a fail-closed Prisma capability injects
  the immutable AsyncLocalStorage tenant context while forced PostgreSQL RLS
  independently enforces the same boundary. Identity and narrowly allowlisted
  system clients use separate least-privilege database roles; there is no
  general `rawDb` escape hatch.
- **Tenant provisioning** — new workspaces are created via a guided
  onboarding flow (`createWorkspaceAction`) that provisions the tenant, the
  Owner role, and default pipeline/stages.
- **Event Bus + durable log** — every engine emits typed events
  (`EventType` union) to an in-process bus with a persistent `Event` table;
  Timeline, Activity Feed, Analytics, Automation, Notifications, Audit, and
  Integrations all subscribe to the same log.
- **Feature Management** — module activation and beta/experimental flags are
  modeled as `Feature` + `FeatureGrant` records, evaluated per request
  (`hasFeature(ctx, key)`).
- **Metadata kernel** — built-in entities (Contact, Deal, Policy, …) register
  their shape via the same versioned-JSONB metadata registry that powers
  runtime-created records, so views/forms/permissions/search read one source
  regardless of origin.

### Authentication & access

- **Better Auth** email/password sessions, DB-backed, same-origin (works on
  any port/host without hardcoding a base URL).
- **RBAC** — role → ownership → team visibility → record-constraint rules →
  admin override, via `can()`/`authorize()`. Permission keys are
  `"<module>.<entity>.<action>"` with wildcard support (`crm.*.read`, `*`).
- **System roles** seeded per tenant: Owner, Administrator, Manager,
  Employee, Client (portal).
- **Field-level rules** and a full `AuditLog` (auth, data, file, permission,
  export, admin, security, AI categories) with a viewer in Administration.
- **One-click demo login** — see [Demo mode](#demo-mode).

### Platform administration

- **Self-service super admin bootstrap** — the very first user to register on
  a fresh deployment is automatically flagged `isSuperAdmin`; no manual DB
  edit or seed step required. Re-claimable: if no super admin currently
  exists, the next registration becomes one.
- **`/platform-admin` panel** — a cross-tenant surface (distinct from the
  per-tenant Administration workspace) visible only to the super admin, with
  its own entry in the Module Rail:
  - **Pricing Plans** — full CRUD over the plans shown on the public pricing
    section, translated per locale (name, description, monthly/annual price,
    button label, feature list), with an "order" and "recommended" flag.
  - **Landing Content** — per-locale text overrides for the landing page's
    highest-value copy (hero, CTA banner, pricing disclaimer); an empty field
    falls back to the built-in translation, so nothing needs a redeploy for a
    quick copy tweak.
  - **Branding** — logo/favicon as externally-hosted image URLs (not a file
    upload — Vercel's serverless filesystem is read-only at runtime), applied
    everywhere the SOBI CRM wordmark renders: workspace rail, login/register
    panel, public contract page, and the landing page/footer.
  - **Announcement Bar** — a promo/notice strip (discount codes, launch
    announcements) shown at the top of both the public landing page and the
    in-app workspace, with per-locale text, background/text color, and a
    scrolling marquee (left↔right or static) via pure CSS animation.
  - Guarded by `requireSuperAdmin()`, a platform-wide flag distinct from the
    tenant-scoped `can()`/`authorize()` permission checks used everywhere else.
- **Rich text editor** — a full TipTap-based editor (bold/italic/lists/links)
  powers every super-admin-authored content field (landing content overrides,
  the hover-to-edit panel below); saved HTML is sanitized server-side
  (`isomorphic-dompurify`) before it's persisted or rendered.
- **Hover-to-edit live CMS mode** — a "Back to main site" entry at the bottom
  of the Module Rail (super admin only) opens the public landing page while
  still signed in. There, hovering any editable text (hero, CTA banner,
  pricing disclaimer) reveals a pencil that opens the rich text editor
  in-place — no need to hunt down the matching field in the admin panel first.

### CRM core

- **Contacts & Companies** — full CRUD, company find-or-create with
  LIKE-injection-safe matching, contact↔company relationships, tags, notes.
  The list shows business/service (company name, or a service-interest note
  for individual contacts), phone, email, registration date, lifecycle stage,
  and lead source (website, manual, chatbot, Telegram, web chat). The 360°
  detail page's timeline is a true end-to-end history — merged from the
  contact's own activity **and the originating lead's**, so it reads from the
  first inbound moment through conversion and everything since — with a
  manual "Add activity" control (log a call/meeting, or create a real linked
  Task as a follow-up reminder, visible in the Ops → Tasks workspace too).
  Companies get the same treatment — an editable details card and the same
  "Add activity" control — plus a **rolled-up timeline**: activity logged on
  any of the company's contacts appears there too, labeled with that
  contact's name, so the relationship stays in sync across every person at
  that business.
- **Leads** — website-form and chatbot intake into one shared queue, each
  lead carrying `source`, `industry` (field of work), `conversationId`
  (linking a chatbot transcript), and free-form `customFields`. A card-based
  list with status filters, search, and CSV export; a manual "New lead" entry
  point alongside the public website form; and a full detail page (`/crm/leads/[id]`)
  with an editable details card, AI scoring, an AI content suggestion, and the
  richer conversion dialog below.
- **Deals & Pipeline** — a generic staged-record engine (Kanban board,
  native drag-and-drop) reused by deals and five industry-module pipelines;
  configurable stages with `isWon`/`isLost` flags driving deal status
  automatically. The default deal pipeline has five active stages — New,
  Reviewing, Consultation, Proposal sent, Final contract phase — plus the two
  terminal Won/Lost outcomes. Every card also has a "move to any stage" menu
  as a tap-friendly alternative to drag-and-drop; below the board, a
  closed/pending summary strip totals won, lost, and still-open deal value
  and count.
- **Activities & Notes** — a per-record timeline (calls, emails, meetings,
  notes, stage changes, files, system events) merged from the `Activity` and
  `Note` tables, automatically fed by anything event-emitting.
- **Tags & Relationships** — a generic `Relationship` model plus a
  standalone **Relationship Graph** (React Flow) visualizing connections
  between any two records.
- **CSV import/export** for core entities.

### Lead conversion & AI scoring

- **Deliberate conversion flow** (`convertLead`) — turns a raw Lead into a
  Contact, find-or-creates its Company, optionally creates a Deal, and files
  the lead's original message as the first timeline note. Idempotent: a
  re-conversion returns the existing contact instead of duplicating it. The
  conversion dialog captures richer fields than the raw lead carries — first/last
  name, job title, corrected email/phone/company, an industry, a service
  interest for individual (non-business) leads, and an extra note — without
  ever rewriting the lead itself.
- **AI lead scoring** — a 0–100 score with a Persian/English/German
  rationale string. Falls back to a transparent, explainable **heuristic**
  (completeness of email/phone/company/source/message) when no AI provider
  key is configured, so the feature is always demonstrable.
- **Conversation summarization** — finds the chatbot `Conversation` linked to
  a contact and summarizes it into 3–5 bullets on the contact's "customer
  knowledge" card.

### AI Operating System

Pipeline: `Providers → Prompt Library → Skills → Tools → Agent Loop →
Action Center → Human Approval → AI Audit`.

- **Providers** — OpenAI, OpenRouter, and a local OpenAI-compatible endpoint,
  selected per tenant. With **no key configured**, a keyless **mock
  provider** produces useful heuristic output for every AI feature — nothing
  ever crashes or silently does nothing for lack of an API key.
- **Skills** — record summary, next-step suggestion (as a pending action),
  email draft, missing-document detection (rule-based, no LLM), lead
  scoring, conversation summarization, and content suggestion (see
  [Knowledge base](#knowledge-base--ai-content-suggestions)).
- **Tool-calling assistant ("Chat with CRM")** — a bounded agent loop
  (max 4 rounds) with four read-only, zod-validated tools —
  `query_leads`, `query_deals`, `query_activities`, `crm_stats` — backed
  directly by the database. The system prompt requires the model to call a
  tool rather than fabricate a number, and the mock provider mechanically
  enforces this by only ever echoing real tool JSON back. Responses stream
  to the client word-by-word.
- **Action Center** — AI skills that would write data never do so directly;
  they create a pending `AiAction` that a human explicitly **approves** or
  **rejects**. Approvals emit `ai.action_approved` and are audited under the
  AI category. Campaign email generation follows the same human-in-the-loop
  principle: AI drafts one recipient at a time, a human reviews every
  message, and nothing sends without explicit approval.
- **AI audit** — every AI call is logged to `AiLog` (skill, provider,
  input/output summary, actor).

### Contracts

- **Auto-numbered** contracts (`CTR-<Jalali year>-<sequence>`) generated
  from a Deal/Contact/Company, using a 10-article Persian consulting
  contract template with a 40/30/30 payment schedule and real substituted
  values.
- **Public share page** — an unguessable `shareToken` link where the client
  reviews, prints (dedicated print stylesheet), and **accepts online**; view
  tracking (`sent → viewed`) and acceptance (`viewed → accepted`) are
  awaited server-side (not fire-and-forget) so serverless response-cutoff
  can't lose the write.
- **Status lifecycle**: draft → sent → viewed → accepted / canceled, with
  edit-locking once accepted.
- **AI rewrite** of the contract body and **AI follow-up** message
  generation.
- Public-context event publishing (`contract.created|sent|viewed|accepted`)
  works even though the public page has no authenticated session, via a
  `publicContext(tenantId)` helper that wraps the write in a minimal
  `PlatformContext` — so Automation/Webhooks still fire for these events.

### Email campaigns

- **Segment-builder module** (`engines/campaigns/segments.ts`), decoupled
  from the campaign engine — named, code-driven audience resolvers (lost
  leads, unfollowed leads, lost deals, won customers), each capped at 20
  recipients.
  <br>
- **Per-recipient AI personalization** — one request at a time (never
  batched/parallel), a ≤120-word/no-hard-sell/free-consultation-CTA system
  prompt, with a mock-provider fallback when no AI key is set.
- **Human-in-the-loop review** — every generated email is editable, can be
  regenerated or skipped, and only sends after an explicit per-recipient
  approval. A "generate all" button runs the sequential loop with a visible
  progress indicator.
- **Strict delivery accounting** — campaign sends use `emailChannel.sendStrict`
  (rethrows real SMTP failures so a send is recorded as `failed`, not
  silently "succeeded"), distinct from the best-effort `emailChannel.send`
  used for in-app notification fan-out.

### Knowledge base & AI content suggestions

- A lightweight internal **Knowledge Base** (`KnowledgeArticle`: title, body,
  tags) editable from the CRM workspace.
- **AI content-suggestion skill** — given a lead, scores every article by
  keyword/tag relevance (never invents an article), picks the best match,
  and drafts a short, grounded follow-up message referencing only that
  article's real content. Falls back to a deterministic template when no AI
  key is configured. If the lead has already converted, the message is also
  logged as a note on the linked contact's timeline.

### Reports & insights

- **Tabular reports** (deals, pipeline, tasks, contacts) with CSV export,
  audited.
- **Visual insights page** (`/mgmt/reports/insights`) — conversion funnel
  (lead → converted → deal → past-first-stage → won, with % of top-of-funnel),
  lead-source breakdown, and 12-month **Jalali-calendar** revenue (real
  Jalali month buckets via `jalaali-js`, not relabeled Gregorian ones),
  rendered with Recharts to match the in-app dashboard-widget style.

### Forms engine

- Drag-and-drop **Form Builder**: sections/tabs, conditional visibility and
  calculated fields (via the shared Business Rules expression evaluator),
  validation generated from metadata into Zod, multi-language labels, basic
  repeaters, versioning, and reusable templates.
- Custom fields on any entity are just fields on that entity's default form.

### Files, tasks, calendar, notifications

- **Document/File engine** — secure upload, categories, versions, preview,
  expiry, per-record required-document checklists, signed download URLs.
- **Tasks** — subtasks, recurrence, dependencies, comments, overdue
  detection via a scheduled job.
- **Calendar** — month/week views, availability, booking conflict detection
  (shared with the service-industry modules).
- **Notifications** — in-app center, email channel, per-user preferences,
  reminder/overdue schedulers.
- **Communication history** — a unified per-record log of emails/calls
  across every channel.

### Dashboards

- **Dashboard Builder** — a `react-grid-layout` canvas with a Widget
  Library (KPI, pipeline breakdown, activity trend, tasks, activity feed,
  module-registered widgets), personal/role/tenant/shared layouts, and
  versioned templates.

### Finance

- **Finance workspace** — cross-module revenue rollups: won revenue and open
  pipeline value from deals, total contract value broken down by status, win
  rate, recently won deals, and the tenant's billing/subscription status.

### Workflow builder & automation

- **Visual Workflow Builder** — stages/steps, Rules-routed approval chains,
  conditions, timers, SLAs, escalations, required fields/documents,
  templates, versioning.
- **Automation engine** — event/schedule triggers → Rules conditions →
  actions (create task, notify, update field, move stage, send email, call
  webhook, trigger an AI skill), with a full `AutomationRun` log feeding
  Observability.
- One shared, sandboxed **JSON-AST expression evaluator** powers form
  conditional logic, workflow gates, and automation conditions — one
  implementation, three consumers.

### Integrations

- **Outbound webhooks** — signed (`HMAC-SHA256`, `X-Sobi-Signature` /
  `X-Sobi-Event` / stable `X-Sobi-Delivery` headers), per-tenant subscriptions
  by event type, durable independently retried delivery with status recording,
  HTTPS enforcement,
  private/metadata-network blocking, DNS pinning, and no redirect following.
- **Scoped API keys** for the public REST API (`/api/v1/...`) with hashed
  throttle identifiers, cursor pagination, stable error envelopes, monthly
  quotas, an OpenAPI contract, and a dependency-free TypeScript SDK.
- **SaaS commercial core** — provider-neutral subscriptions, trials,
  machine-readable plan entitlements/limits, atomic usage counters, and a
  conservative free-plan fallback. Manual billing is explicit until a PSP
  adapter is configured.
- **Contact CSV imports** — private source storage, bounded parsing and mapping,
  durable processing, per-row error summaries, quota checks, and idempotent
  retry coordinates.
- OAuth and third-party provider scaffolding (Google, Microsoft, WhatsApp,
  Telegram, Stripe, PayPal) is architected but not wired to live credentials
  — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Industry modules

Each module is a thin composition of the shared engines (Pipeline, Booking,
Documents, Finance) plus a manifest (workspace, nav, permissions,
relationship kinds, i18n). **All eight ship a bespoke dashboard (KPI cards +
an upcoming/recent list) and list views with a create flow**, seeded with demo
data:

| Module | Composition |
|---|---|
| **Insurance** | products, carriers, policies with renewal reminders, claims, commissions |
| **Loan & Banking** | applications, bank partners, encrypted applicant profile, credit checklist, repayment plans |
| **Real Estate** | properties, buyer/seller roles, viewings, offers, contracts, client↔property matching |
| **Sales & Agency** | campaigns, proposals, targets, performance |
| **Immigration** | visa/permit cases, authority submissions, required-document templates, deadlines |
| **Barber Shop** | services, staff, chairs, appointments, walk-ins, visit history |
| **Beauty Salon** | + treatment series, before/after photos, consent forms |
| **Restaurant** | table reservations, guest allergy/preference profiles, catering leads |

Six additional spec modules (Investment, Legal, Education, Healthcare,
Service & Maintenance, Project Management) are registered as "coming soon"
scaffolds in module activation.

### Low-code studio

- **Industry Templates** — apply a ready-made vertical solution (Fitness Studio,
  Dental Clinic, Consulting Firm, …) that instantiates configured entities and
  sample data on the low-code kernel. Industries are *data, not code*: a
  business activates its industry and gets a customizable starting point rather
  than a hardcoded module.
- **Entity Builder** — create a custom entity (fields, relationships) and use it
  immediately through the generic entity workspace: a metadata-driven records
  list and create form generated from the entity's field definitions, with no
  bespoke code.
- **Business Rules** — a dedicated editor for reusable validation, eligibility,
  approval, and calculation rules, stored as a safe expression AST and evaluated
  across forms, workflows, and automations.
- **Templates** — author reusable email, document, notification, report, and
  AI-prompt templates with `{{variable}}` interpolation and live variable
  detection.
- **Version history** panels shared across every builder (forms, workflows,
  dashboards, automations, entity definitions).
- **Command Platform** — a `Ctrl+K` command palette combining navigation,
  entity actions, and search results in one context-aware surface.
- **Universal Search** — Postgres full-text search across entities, files,
  notes, activities, reports, and commands.

### Security, audit & GDPR

- Argon2 password hashing, DB sessions (httpOnly, SameSite), Redis-backed
  distributed rate limiting in production.
- Per-request nonce CSP (`strict-dynamic`, no production inline scripts),
  HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
  `Permissions-Policy` security headers.
- AES-256-GCM field-level encryption for sensitive data (e.g. loan-applicant
  income/employment).
- Soft delete + trash for the core entities; full audit trail including file
  access and data exports.
- GDPR: consent records, a personal-data export bundle
  (`/api/v1/gdpr/contacts/:id/export`), and a deletion workflow with
  anonymization + configurable retention policies.
- Structured logging (Pino) plus an in-DB request/error/job/AI/automation
  metrics store feeding an **Admin Health Dashboard**.

### Marketing landing page

- A full public marketing page at `/` (shown only to logged-out visitors —
  an authenticated session still redirects straight to `/crm`), visually
  independent from the in-app design system (its own pine/teal palette,
  Manrope/DM Sans typography) so it reads as a "sales site," not an app
  screen.
- Sections: sticky nav, hero (with a live mini leads-table mockup, not a
  screenshot), a dark problem/solution section grounded in the real
  lead-conversion flow, a four-step workflow explainer, a live analytics
  preview, per-industry solution tabs, illustrative pricing (explicitly
  marked "not a live commercial offer"), an FAQ, and a demo/register CTA
  banner.
- Fully localized (English/German/Persian, RTL for Persian) via the same
  `next-intl` setup as the rest of the app.
- "Try demo" / "Enter demo workspace" buttons trigger the same one-click
  demo login used on the sign-in page.
- **Pricing plans, hero/CTA copy, and the logo** are all sourced live from the
  Platform Administration panel (with static fallbacks), so a super admin can
  tune the sales pitch without a code change — see
  [Platform administration](#platform-administration).
- A genuine **monthly/annual pricing toggle** — switching shows different
  numbers per tier (not a cosmetic-only label swap) plus a "billed annually"
  note.
- **Fully mobile-optimized**: a real hamburger menu (not a hidden nav) exposes
  every nav link, the language switcher, and sign-in/demo/register actions
  below the `lg` breakpoint, plus a **bottom tab bar** for quick thumb-reach
  access to Features, Modules, Pricing, and Try demo while scrolling (with a
  "Menu" button opening the same full panel as the hamburger); same for the
  login page, whose brand panel stacks above the form on mobile instead of
  disappearing.
- The **in-app workspace** is mobile-optimized too: the Module Rail — always
  visible on desktop, collapsible between icon-only and a labeled expanded
  state (remembered across sessions) — becomes a slide-in drawer on mobile
  (opened from a Topbar hamburger) with the exact same collapse/expand
  control, and every data table scrolls horizontally instead of clipping.
- **Accordion sidebar navigation** — each workspace's sub-pages (Contacts,
  Companies, Leads, Deals, …) nest directly inside the rail as an expandable
  section instead of a separate top strip; the active section auto-opens. The
  8 industry business modules are gathered under one collapsible **Templates**
  group, reflecting the industry-templates direction (see
  [Industry Templates](#low-code-studio)) rather than cluttering the primary
  navigation.
- **Per-feature help** — a "?" button next to almost every page's title opens
  a short explainer (how the feature works, why it's useful) localized to the
  active workspace language; see `helpTopics` in the i18n messages and
  `src/components/patterns/feature-help.tsx`.
- Every dialog keeps a comfortable side gutter on narrow screens (`calc(100%-2rem)`
  instead of edge-to-edge `100%`) — a small, systemic fix that benefits every
  modal in the app on mobile.

### Branding & internationalization

- Product name and mark: **SOBI CRM**, with a real logo/favicon asset used
  consistently across the in-app workspace rail, the login/register brand
  panel, the public contract page, and the landing page.
- Three locales — English, German, Persian — with full right-to-left layout
  support for Persian (logical CSS properties throughout, not just
  `dir="rtl"` on the root).
- **Vazirmatn** is the Persian-locale font everywhere: the main workspace
  (via a `:lang(fa)` CSS custom-property swap of `--font-ui`) and the
  landing page (via an equivalent `--landing-font-*` swap), so nothing
  silently falls back to a Latin font for Persian text.
- Jalali (Shamsi) calendar support for contract numbering and the revenue
  report, via the well-tested `jalaali-js` library.

### Demo mode

- A **one-click "Continue with demo workspace"** button on the login page
  and landing page, signing in as a seeded demo user
  (`sara@novak.test` / tenant "Novak Insurance Group") — no signup required
  to explore the product.
- **Gated out of production builds** (`process.env.NODE_ENV !== "production"`)
  — verified to be fully absent, including the credential string, from the
  production client bundle. This is a standing credential bypass meant for
  evaluation, not something exposed on a real commercial deployment.
- The seed script (`prisma/seed.ts`) populates a realistic demo tenant:
  companies, contacts, deals across pipeline stages, open and converted
  leads (one with a linked chatbot conversation), a knowledge article, a
  sent contract, and a draft campaign — so every feature above has real
  data to demonstrate against immediately after `npm run db:seed`.

---

## Architecture at a glance

```
src/
  core/       Platform kernel — auth, tenancy, RBAC, event bus, jobs,
              metadata, rules, templates, versions, features, commands,
              observability, security, gdpr  (no business logic)
  engines/    Reusable Business Engines — crm, pipeline, booking, workflow,
              forms, documents, files, finance, notifications, dashboards,
              reporting, analytics, timeline, feed, graph, search,
              automation, integrations, ai, entity-builder, portal,
              contracts, campaigns, knowledge
  modules/    Thin business modules composing engines (insurance, …)
  components/ Design system: ui/ primitives, patterns/, layout/, brand/
  app/        Next.js routes — [locale]/(auth|app|public|landing), api/v1
```

Dependency rule (lint-enforced): **modules → engines → core**, never sideways.

See [`docs/`](docs) for the full architecture, security model, engine
catalogue, event catalogue, AI OS, and deployment guide.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (incl. architectural import boundaries) |
| `npm run test` | Vitest unit suite |
| `npm run test:rls` | PostgreSQL two-tenant isolation suite |
| `npm run db:migrate` / `db:generate` / `db:seed` / `db:studio` | Prisma |

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for environment variables,
platform options (managed vs. self-hosted), the background-job scheduler,
and the release checklist. Key points for serverless platforms (Vercel and
similar):

- `DATABASE_URL` must point to a **reachable managed Postgres** (Neon,
  Supabase, RDS, …) — the local Docker Postgres used in development is not
  reachable from a deployed environment. If your provider fronts connections
  with a pooler (e.g. Supabase's pgbouncer), also set `DIRECT_URL` to a
  **non-pooled** connection string — `prisma migrate deploy` requires it,
  since pooler transaction mode doesn't support schema migrations.
- Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and
  `FIELD_ENCRYPTION_KEY` to real production values (never reuse the dev
  placeholders in `.env.example`).
- Production requires the built-in S3-compatible storage driver and Redis;
  local disk and the memory limiter remain development-only fallbacks.
- Business events use a PostgreSQL outbox; automation and webhook jobs have
  atomic multi-worker claims, crash leases, deduplication, and bounded retry.
- `npx prisma migrate deploy` must run against the production database
  before (or as part of) the first deploy.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/AI-OS.md`](docs/AI-OS.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/MODULES.md`](docs/MODULES.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
