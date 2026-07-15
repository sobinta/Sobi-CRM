# SOBI CRM landing page + rebrand — design

## Goal

1. Rebrand the product from "Coreline" to "SOBI CRM" across all user-facing surfaces.
2. Add a professional marketing landing page at the root route, styled after a reference site ("MeetIQ", inspected locally at `http://127.0.0.1:5174/`), reusing its visual system but with copy specific to this CRM.

## 1. Rebrand: "Coreline" → "SOBI CRM"

### Scope (confirmed with user)

**In scope** — user-facing brand strings:
- `package.json` `name` field (`coreline` → `sobi-crm`)
- `src/app/[locale]/layout.tsx` — page metadata (title template, description, applicationName)
- `src/app/manifest.ts` — PWA manifest name/short_name
- `src/components/layout/topbar.tsx`, `src/components/layout/module-rail.tsx` — nav logo text
- `src/components/patterns/command-palette.tsx` — placeholder text referencing the product name
- `src/engines/notifications/channels.ts` — email "from" display name
- `src/engines/integrations/webhook-engine.ts` — outbound User-Agent / webhook signature identifier string (only if it's a display string, not a technical constant other systems depend on — verify before changing)
- `src/core/db.ts`, `src/components/ui/chip.tsx` — check occurrence; likely a comment, update if so
- `src/i18n/messages/{en,de,fa}.json` — any brand-name strings
- `README.md`, `docs/AI-OS.md`, `docs/ARCHITECTURE.md` — headers/prose mentioning the product name
- New landing page and its copy (written fresh with "SOBI CRM")

**Out of scope** — internal, non-user-facing identifiers: Prisma client output path (`src/generated/prisma`), internal variable/function names, docker service names, `.env` var names, git remote/repo name. Changing these is pure churn with no user-visible benefit and risks breaking generated-code references.

**Verification:** after the rename, re-run the same repo-wide case-insensitive search for "Coreline" (excluding `node_modules`, `.next`, `generated`) and confirm zero remaining matches in the in-scope file set; grep for "SOBI" in the same set to confirm the new name landed everywhere intended.

## 2. Landing page

### Routing

- **`src/app/[locale]/page.tsx`** (currently unconditionally redirects to `/crm`): change to check `resolveSession()` first. If a session exists, keep the existing redirect to `/crm` (authenticated users skip the marketing page). If no session, render the landing page directly — no separate route needed, since the root **is** the marketing page (same pattern as the reference site: `/` serves the public page, the app itself lives at `/crm` once authenticated).
- The landing page's section components live under `src/app/[locale]/landing/` (co-located with the root page, not under `(public)`, since `(public)` is for the existing token/form-gated public pages like `/contract/[token]` and `/p/[slug]/lead` — this is unauthenticated marketing content with different concerns). Each section defines its own full-bleed container, same as the reference.
- Locale-aware: build under `[locale]`, pull copy from a new `landing` i18n namespace in `en.json`/`de.json`/`fa.json` (fa gets RTL automatically via the existing `dir` handling in the locale layout).
- Not gated behind auth; publicly crawlable (no `noindex`).

### Visual system

New CSS custom properties, scoped to the landing page only (e.g. a `landing-theme` class wrapping the page, or a small local stylesheet/module) so they don't leak into or conflict with the app's existing design tokens:

```
--landing-bg: #f5f7f5
--landing-surface: #fff
--landing-surface-2: #f0f3f1
--landing-text: #14211e
--landing-muted: #65716d
--landing-faint: #8c9692
--landing-line: #dde4e0
--landing-primary: #183f3b     /* dark pine — nav, dark sections, primary buttons */
--landing-primary-2: #2f7d72   /* mid teal — accent headline color, links */
--landing-mint: #aee1d3        /* light accent — CTA button in dark sections */
--landing-amber: #bd7d25
--landing-red: #c85550
--landing-radius: 14px
--landing-shadow: 0 12px 36px rgba(25,48,42,.08)
```

Typography: add Manrope (display headings) and DM Sans (body) via `next/font/google` in the root layout, same pattern as the existing Hanken Grotesk/IBM Plex Mono/Vazirmatn fonts — scoped with their own CSS variables and applied only within the landing page's wrapper class, so the rest of the app keeps using Hanken Grotesk untouched. Matching the reference precisely matters more here than minimizing font count on a page that exists specifically to look distinct from the in-app UI.

### Sections (top to bottom)

1. **Sticky nav** — SOBI CRM logo/wordmark, links (Features, How it works, Modules, Pricing, FAQ), locale switcher (reuse existing locale-switch component), "Sign in" (→ `/login`), "Try demo" (→ triggers the existing one-click demo-login flow built earlier — same `DEMO_CREDENTIALS` sign-in call, dev-only gated exactly like the login page's demo button), "Start free" (→ `/register`).
2. **Hero** — badge pill ("AI-native CRM · works without an API key" or similar, echoing the mock-provider graceful-degradation story), headline: *"Turn every lead into / a closed, signed deal."* (second line in `--landing-primary-2`), subhead describing lead→contact→deal→contract→campaign in one sentence, dual CTA ("Start organizing leads" primary / "Explore live demo" secondary), checklist ("No credit card" / "Local demo data" / "Editable results" — reuse verbatim, they're true here too), floating product-screenshot card on the right (a real cropped screenshot of the CRM leads table or pipeline kanban, framed in a browser-chrome mockup card like the reference).
3. **Dark full-bleed problem section** — eyebrow "FROM LEAD TO CLOSED DEAL", headline about outcomes getting lost without a system, 4 numbered pain points (leads go cold in inboxes / follow-ups get forgotten / contracts live in someone's email / no visibility into what's actually closing), plus a connected card showing the real flow: raw lead message → structured conversion → contract sent — this directly mirrors the "classic CRM conversion" flow already built (`engines/crm/lead-service.ts`).
4. **"Four steps" timeline** — Capture (website + chatbot intake) → Convert (lead → contact + company + deal) → Close (AI-drafted contract, online acceptance) → Grow (AI-personalized campaigns, reporting) — each step description grounded in an actually-shipped feature, no invented capability.
5. **Split analytics section** — copy on the left, a real cropped screenshot of the `/mgmt/reports/insights` funnel/revenue charts on the right, "Open the dashboard" link.
6. **Tabbed solutions section** — tabs by *industry module* (Insurance / Real Estate / Immigration / Barber Shop / Beauty Salon / Restaurant / Sales & Agency) instead of MeetIQ's team-role tabs. Each tab: short copy + a testimonial-style quote clearly labeled fictional (matches MeetIQ's own "— Maya Chen, fictional demo persona" convention, so we're not fabricating real customer claims).
7. **Pricing** — Free / Pro / Team / Enterprise tiers, monthly/annual toggle, explicit disclaimer line: *"Prices below are illustrative for this product demo and do not represent a live commercial offer."* — matches the reference's own honesty and is consistent with the earlier commercial-readiness conversation in this project (SaaS billing isn't actually implemented yet).
8. **FAQ accordion** — CRM-relevant questions: "Do I need an AI API key?" (no — graceful mock fallback), "Is my data isolated from other tenants?" (yes — data-layer multi-tenancy), "Can I activate only the modules I need?" (yes), "What happens to demo data?", "Is the contract template legally reviewed?" (honest answer: it's a generated starting point, review with your own counsel before real use — surfacing the real caveat from the earlier commercial-readiness discussion rather than overclaiming).
9. **Dark CTA banner** — "Enter demo workspace" (demo login) / "Create a free workspace" (register).
10. **Footer** — SOBI CRM wordmark + tagline, link columns (Product / Solutions / Resources / Company / Legal — reuse structure, adjust link targets to real routes or `#` placeholders where no page exists yet), copyright line.

### Components

New, scoped to the landing page (not shared with the in-app design system, to keep the "marketing site" visually independent per the design goal):
- `src/app/[locale]/(public)/landing/landing-page.tsx` (or split into `hero.tsx`, `problem-section.tsx`, `steps-section.tsx`, `analytics-section.tsx`, `solutions-tabs.tsx` (client component for tab state), `pricing-section.tsx` (client component for monthly/annual toggle), `faq-section.tsx` (client component for accordion), `cta-banner.tsx`, `landing-nav.tsx`, `landing-footer.tsx`) — broken into focused files rather than one giant page component, following the project's existing pattern of small composable pieces per route.
- Demo-login trigger reused from the existing login-form logic — extract the `signInWith`/`DEMO_CREDENTIALS` helper into a small shared client util (e.g. `src/core/auth/demo-login.ts`, dev-only gated) so both the login page and the landing page's "Try demo" / "Enter demo workspace" buttons call the same code instead of duplicating the credential constant.

### Non-goals

- Not rebuilding the in-app design system or touching any authenticated-app screen's visuals.
- Not implementing real payment/billing (pricing section is explicitly illustrative, matching current commercial-readiness state).
- Not adding new "module" content pages behind the solutions tabs — the tabs are landing-page copy only, linking to `#` or existing routes where they already exist (e.g. `/m/insurance`).
- Not localizing the floating product screenshots per-locale (screenshots stay in whichever locale they were captured; acceptable for a v1 marketing page).

## Verification

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
- Manually verify in the browser: logged-out visit to `/`, `/en`, `/de`, `/fa` each render the landing page correctly (fa in RTL); "Try demo" / "Enter demo workspace" successfully logs in via the existing demo credentials and lands on `/crm`; "Start free" goes to `/register`; "Sign in" goes to `/login`; an authenticated session visiting `/` still redirects straight to `/crm` (no regression).
- Grep-verify the rename: zero remaining "Coreline" in the in-scope file set; "SOBI CRM" present in nav, footer, page title, manifest, README.
- Confirm the demo-login trigger stays dev-only gated on the landing page exactly as it is on the login page (no accidental prod exposure of a second entry point).
