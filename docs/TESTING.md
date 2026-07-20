# Testing & verification checklist

## Automated
- `npm run test` — Vitest unit suite: the sandboxed expression evaluator
  (incl. prototype-pollution guards), permission matching, tenant-query
  scoping/model classification/relation guards, the `can()` matrix, and
  AES-GCM field encryption, provider-backed rate limiting, retry backoff,
  durable-consumer catalog, and S3 provider selection. The PostgreSQL suite is
  skipped here by design.
- `npm run test:rls` — destructive-test-safe PostgreSQL integration suite on
  random temporary tenant rows. Requires a migrated database and all four
  least-privilege URLs from `.env`; proves ORM/raw read isolation, pool reuse,
  forced tenant stamping, and database rejection of a cross-tenant relation.
- `npm run typecheck` — strict TypeScript, zero errors.
- `npm run lint` — ESLint incl. architectural import-boundary rules
  (modules → engines → core).
- `npm audit --audit-level=moderate` — release gate for known dependency
  advisories. The lockfile currently resolves with zero reported issues.

## Manual end-to-end (against `npm run dev` + seeded data)
1. **Auth & tenancy** — register a workspace; confirm you land in the shell with
   your name, tenant badge, and the seeded roles. A second tenant sees none of
   the first tenant's data.
2. **CRM** — create a contact; drag a deal across Kanban stages and confirm the
   stage change appears on the deal's timeline and the activity feed.
3. **Forms** — in Studio, add a conditional field to a form, publish it, and
   confirm a new version is recorded.
4. **Operations** — create a task; upload a file and download it via the signed
   route; add a calendar event; confirm the notification bell increments and an
   email lands in Mailpit.
5. **Dashboards & search** — edit the Management dashboard (drag/add widgets,
   save); `⌘K` and search a contact by name; export a report as CSV.
6. **Automation & integrations** — create an automation
   (`deal.won → create task`), trigger it, and see the run logged; add a webhook
   and API key, then call `/api/v1/public/contacts` with the key. Run the job
   tick and confirm an `AutomationRun` and `WebhookDelivery` are persisted;
   retry a failed endpoint and confirm `X-Sobi-Delivery` stays stable.
7. **Modules & portal** — activate a module in Administration and confirm its
   workspace appears in the rail; submit the public lead form at
   `/p/<slug>/lead` and confirm a website lead is created.
8. **AI** — on a contact, run *Summarize* and *Suggest next step*; approve the
   suggestion in the AI Action Center and confirm the task is created and the
   action is audited.
9. **Studio low-code** — build a custom entity in the Entity Builder and add
   records.
10. **GDPR & health** — export a contact's data bundle; open the System Health
    dashboard and confirm job/automation/AI/security signals render.
11. **i18n & theming** — switch to `fa` (RTL + Vazirmatn) and `de`; toggle dark
    mode; change the brand hue in the Theme Builder and confirm the app
    re-themes.

## Tenant-security release gate

On a fresh PostgreSQL 16 volume run, in order:

```bash
npm run db:deploy
npm run db:seed
npm run test:rls
npm run test
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

The RLS test intentionally does not auto-run on an arbitrary developer
database. `RUN_DATABASE_INTEGRATION_TESTS=true` is set only by `test:rls`.

Security unit coverage includes SSRF address policy/DNS pinning, upload
envelope and magic-byte checks, API scopes, public-token shape/expiry,
production environment validation, safe public error mapping, and CSP policy.
Use the Compose Redis/MinIO services to smoke-test distributed throttling and
S3 uploads; production must never fall back to memory or local disk.
