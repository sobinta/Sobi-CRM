# SOBI CRM — a modular Business Operating System

SOBI CRM is a multi-tenant, metadata-driven, AI-native **Business Operating
System**. CRM is its flagship capability, built on a shared platform where each
tenant activates only the industry modules relevant to their business.

It is not a demo — it is a real, commercial-grade foundation: strong security
and GDPR posture, low-code configurability (form / workflow / entity / dashboard
builders), an automation engine, an integration layer, and an AI Operating
System with a human-approval gate.

## Stack

- **Next.js 16** (App Router, RSC) + TypeScript strict
- **PostgreSQL 16** + **Prisma 7** (multi-file schema)
- **Better Auth** (email/password, DB sessions) + a custom tenant / RBAC layer
- **Tailwind CSS v4** + a custom OKLCH design system (not a stock template)
- TanStack-style data tables, **dnd-kit** Kanban, **React Flow** graph,
  **react-grid-layout** dashboards, **Recharts**, **cmdk** command palette
- **next-intl** i18n — English, German, and Persian (full RTL, Vazirmatn)

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

Register a workspace at `/en/register`, or use the seeded demo tenant.
Mailpit (outgoing email) is at http://localhost:8025.

> **Ports:** Postgres is mapped to **5433** in `docker-compose.yml` (adjust
> `DATABASE_URL` if you change it). Mailpit uses 1025 (SMTP) / 8025 (web).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (incl. architectural import boundaries) |
| `npm run test` | Vitest unit suite |
| `npm run db:migrate` / `db:generate` / `db:seed` / `db:studio` | Prisma |

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
  components/ Design system: ui/ primitives, patterns/, layout/
  app/        Next.js routes — [locale]/(auth|app|public), api/v1
```

Dependency rule (lint-enforced): **modules → engines → core**, never sideways.

See [`docs/`](docs) for the full architecture, security model, engine
catalogue, event catalogue, AI OS, and deployment guide.

## Highlights

- **Data-layer multi-tenancy** — a Prisma client extension injects `tenantId`
  from an AsyncLocalStorage context, so cross-tenant access is structurally
  impossible (not just filtered per-handler).
- **Event Bus + durable log** — every engine emits events; Timeline, Feed,
  Analytics, Automation, Notifications, Audit, and Integrations subscribe.
- **One rules evaluator** — a sandboxed JSON-AST expression engine powers form
  conditional logic, workflow gates, and automation conditions alike.
- **AI proposes, humans approve** — AI skills never write directly; they create
  pending actions in the AI Action Center, and every call is audited. Works
  with no API key via a graceful mock provider.
- **Activation-aware workspaces** — enabling a module in Administration makes its
  workspace appear in the rail, permission-filtered.
- **Full CRM sales cycle** — website/chatbot lead intake → deliberate
  conversion into Contact + Company + Deal → an auto-numbered, publicly
  shareable **contract** (Jalali numbering, online acceptance) → AI-scored
  leads, AI content suggestions from an internal **knowledge base**, and
  human-reviewed AI-personalized **email campaigns**. See
  [`docs/AI-OS.md`](docs/AI-OS.md).
