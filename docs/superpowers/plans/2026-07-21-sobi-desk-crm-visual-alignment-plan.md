# Sobi Desk / Sobi CRM Visual Alignment — Phase 1 Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-21-sobi-desk-crm-visual-alignment-design.md`  
**Restore point:** `pre-sobi-desk-zip-alignment-2026-07-21`

## 1. Preserve baseline and diagnose the dashboard failure

- Reproduce `/fa/crm` in the authenticated browser and inspect the server-side
  failure rather than masking it in the UI.
- Keep the existing desktop/mobile screenshots under `output/playwright/` as
  ignored visual baselines.
- Confirm the repository is clean before implementation files are changed.

## 2. Align the shared shell

- Update `module-rail.tsx` to 210px expanded / 72px compact geometry.
- Give rail links and utilities 44px targets, contained active/focus signals,
  localized tooltips, and `aria-expanded` on the collapse button.
- Derive collapse/expand chevrons from document direction and state; add a
  small pure helper with unit coverage for all four RTL/LTR combinations.
- Make localStorage access tolerant of unavailable or blocked storage.
- Update `topbar.tsx` and `sidebar.tsx` to the approved 52px shell rhythm and
  localized navigation labels.
- Preserve the current module model, routes, permission visibility, dark rail,
  and mobile drawer behavior.

## 3. Apply approved logo prominence

- Set landing navigation logo height to 52px while preserving header fit.
- Set application rail mark to 56px inside a dedicated brand zone.
- Set login logo height to 78px and adjust its row responsively so locale
  controls do not collide.
- Verify default and tenant-supplied brand assets keep their aspect ratio.

## 4. Add tenant-safe CRM dashboard data

- Add a server-only CRM dashboard service using the existing request-scoped
  platform context and tenant-enforcing Prisma client.
- Authorize CRM lead/deal reads and conditionally expose task/follow-up and
  quick-action data according to the current permissions.
- Query in parallel for the 30-day lead metric and comparison, conversion,
  active pipeline grouped without summing unlike currencies, pipeline stages,
  personal due/overdue follow-ups, and recent events.
- Return a serializable view model with dates converted at the server/client
  boundary and no client-provided tenant authority.
- Add focused unit tests for pure percentage/comparison and direction helpers;
  rely on existing tenant/RLS coverage for the shared database capability.

## 5. Build the operational dashboard UI

- Replace the placeholder `/[locale]/crm/page.tsx` with a Server Component
  that resolves the dashboard bundle inside `withPlatformContext`.
- Add quiet, token-driven KPI cards, an accessible pipeline list/chart with a
  text equivalent, upcoming follow-ups, recent activity, and permission-aware
  quick links.
- Use CSS/Tailwind structure instead of a client chart dependency where a
  semantic list communicates the data more clearly and with less JavaScript.
- Add a meaningful `loading.tsx` skeleton matching final geometry.
- Add valid empty states for tenants with no CRM data.
- Add a route-level `error.tsx` only if the diagnosed failure needs a bounded
  recovery surface; expected empty or permission states remain explicit
  return values.

## 6. Complete changed-surface localization

- Expand the `dashboard` and `shell` namespaces in `en.json`, `de.json`, and
  `fa.json` for every new label, state, tooltip, action, date context, and
  accessible description.
- Remove hard-coded English from the changed deals header/toolbar surface so
  `/fa/crm/deals` no longer presents an English page title and primary action.
- Use locale-aware `Intl` formatting and direction isolation for amounts,
  percentages, dates, emails, and identifiers.

## 7. Validate and critique visually

- Run focused unit tests, full tests, lint, typecheck, and production build.
- Exercise English LTR and Persian RTL in expanded and compact rail states,
  including reload persistence and all arrow directions.
- Exercise the mobile drawer at 390px and a 375px small-phone viewport,
  keyboard/Escape behavior, horizontal contextual navigation, light/dark, and
  reduced-motion.
- Verify populated and empty dashboard states where available without adding
  fake production data.
- Capture final desktop and mobile screenshots, compare against the approved
  balanced-alignment mockup, remove any decoration that competes with CRM
  operations, and leave a local preview running for review.
