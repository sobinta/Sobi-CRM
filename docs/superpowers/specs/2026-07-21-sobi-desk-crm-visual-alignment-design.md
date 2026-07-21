# Sobi Desk / Sobi CRM Visual Alignment — Phase 1 Design

**Status:** Approved design, pending implementation plan  
**Date:** 2026-07-21  
**Restore point:** `pre-sobi-desk-zip-alignment-2026-07-21`  
**Reference archive:** `SOBI-Desk-design-reference-for-Sobinta-20260721.zip`  
**Reference SHA-256:** `B2C7FE1EE43AC419424C4B344038FC33D2DB77246357C5CDCC243E3DA1064ECF`

## 1. Objective

Make Sobi CRM and Sobi Desk feel like products in one Sobinta suite without
erasing the product identity of Sobi CRM. Phase 1 adopts Sobi Desk's shell
geometry, density, component contracts, responsive behavior, and interaction
language while preserving Sobi CRM's viridian/petrol and copper palette,
current two-level navigation model, routes, capabilities, permissions, tenant
context, and security architecture.

The approved direction is **balanced alignment**. This is intentionally
neither a cosmetic token-only refresh nor a wholesale copy of the Sobi Desk
shell. The dark Sobi CRM module rail remains the product signature.

## 2. Sources and constraints

The supplied Sobi Desk archive is a design and interaction reference only.
The following may be adopted:

- shell dimensions and density;
- navigation behavior;
- typography roles;
- card, button, form, loading, empty, and error states;
- responsive patterns;
- accessibility and motion policy.

The following must remain product-specific and must not be copied from the
reference:

- authentication or authorization logic;
- tenant resolution and data isolation;
- persistence, APIs, cloud configuration, or deployment behavior;
- product routes, capability rules, workflows, and business data;
- the Sobi Desk blue palette, logo, module names, and information architecture.

All implementation must comply with the repository's Next.js documentation
under `node_modules/next/dist/docs/` before framework code is changed.

## 3. Phase 1 scope

Phase 1 includes:

1. the shared application shell, top bar, contextual navigation, and mobile
   drawer;
2. the collapsible module rail with correct LTR/RTL behavior;
3. the `/[locale]/crm` operational dashboard and the existing 500 error on
   that route;
4. logo sizing on the landing page, application workspace, and sign-in page;
5. shared primitives and states needed by the changed surfaces;
6. responsive behavior, dark mode, reduced motion, accessibility, and
   localization for changed surfaces;
7. browser, type, lint, test, and production-build verification.

Specialized pages such as contacts, companies, leads, deals, contracts,
campaigns, knowledge, and graph retain their current workflows and structure.
They may inherit corrected shared tokens or primitives, but page-specific
redesign is deferred to a later phase.

## 4. Information architecture and shell

The current two-level model remains:

```text
desktop  [module rail][top bar + contextual destinations][operational canvas]
mobile   [top bar + modal module drawer]                  [single-column canvas]
```

### 4.1 Geometry

- top bar height: `52px`;
- contextual navigation row height: `52px`;
- expanded module rail width: `210px`;
- compact module rail width: `72px`;
- minimum interactive target: `44px` by `44px`;
- control radius: `8px`;
- card radius: `12px`;
- dialog radius: `18px`;
- spacing scale: `4, 6, 8, 10, 12, 16, 20, 24, 32px`.

The canvas uses the existing warm neutral surfaces. Operational cards use one
border and, where required, one quiet raised shadow. Decorative gradients and
nested card frames are not used for KPI or workflow content.

### 4.2 Module rail

The existing dark rail and CRM module ordering are preserved. Expanded and
compact states persist using the existing browser-local preference, with a
safe default when storage is unavailable. The rail must not change routing or
permission checks.

Compact mode is icon-only. Every item has a localized accessible name and a
localized tooltip. Active rings, focus rings, and the copper active signal
must remain fully contained within the 72-pixel rail.

The collapse control is direction-aware:

| Document direction | Expanded state | Compact state |
| --- | --- | --- |
| LTR | points left | points right |
| RTL | points right | points left |

The button exposes `aria-expanded` and a localized action label that describes
the result of activating it. Direction is derived from the active locale or
document direction, not from visual transforms that reverse unrelated icons.

### 4.3 Mobile navigation

The persistent rail is replaced by a full-height modal drawer. The drawer:

- traps focus while open;
- closes on Escape, explicit close, or successful destination navigation;
- makes the background inert;
- provides an accessible dialog name;
- preserves module ordering and capability visibility;
- respects RTL/LTR placement and animation direction.

The contextual CRM destination row remains horizontally scrollable on narrow
screens. The active destination must be visible after navigation and must not
be identified by color alone.

### 4.4 Top bar

Global search, notifications, profile, locale, and theme behavior remain
functionally unchanged. Their visual density is aligned to the 52-pixel shell.
Controls retain 44-pixel hit areas even where the visible icon is smaller.

## 5. Brand and logo treatment

Sobi CRM retains its existing logo, viridian/petrol brand ramp, copper accent,
and warm-neutral surfaces. Sobi Desk blue values are not imported into CRM
semantic tokens.

Approved target logo sizes are:

- landing navigation: `52px` (two times the current 26-pixel size);
- application workspace: `56px` (two times the current 28-pixel size);
- sign-in surface: `78px` (three times the current 26-pixel size).

These are target mark sizes, not permission to enlarge the top bar. The
application logo receives a dedicated brand zone in the rail. At narrow
breakpoints, sizing may be constrained only where required to prevent overflow
or overlap, while retaining the intended visual prominence.

## 6. CRM dashboard

The current placeholder dashboard becomes an operational overview for the
active tenant. It contains the following regions in priority order.

### 6.1 Header

- localized greeting or workspace title;
- localized date and short status context;
- one primary quick-action trigger.

The quick-action entry may expose creation actions for contact, lead, deal,
and task only when the current user has the corresponding capability.

### 6.2 KPI row

The first release contains four tenant-scoped metrics:

1. new leads for the defined reporting window;
2. total active pipeline value;
3. lead/deal conversion rate using one documented denominator;
4. follow-ups due today, including an overdue or urgent sub-signal.

Every KPI includes a label, formatted value, and a comparison or context line.
Color is supplemental. Values are formatted with the active locale and the
configured currency. Mixed-direction values use explicit isolation so that
currency symbols and identifiers remain readable in Persian.

### 6.3 Pipeline panel

The pipeline panel reports count and value by the application's existing deal
stages. It uses real tenant data and existing stage semantics. The chart must
have an accessible text/table equivalent and must remain understandable
without relying on color. RTL changes reading layout, not the business order
of stages unless the existing domain model explicitly defines a visual order.

### 6.4 Upcoming follow-ups

This panel shows the next relevant tasks or follow-ups with due time, priority,
owner or record context, and a link to the underlying record when authorized.
Overdue items are announced in text and not only through copper or danger
color.

### 6.5 Recent activity

The activity panel uses existing audit/activity data if available. It must not
create a parallel activity store merely for the dashboard. Entries expose the
actor, action, record context, and localized relative or absolute time.

### 6.6 Responsive order

- wide desktop: four KPI columns, pipeline as the primary wide panel, and
  follow-ups/activity in the secondary column;
- tablet: two KPI columns and panels stacked by priority;
- narrow mobile: one KPI column and a single content column.

Visual order and DOM order remain consistent so keyboard and screen-reader
users receive the same priority.

## 7. Data flow and tenant safety

Dashboard data is computed from real records for the active tenant. No demo
numbers are embedded in production components. Aggregation should occur on the
server or data layer where practical rather than transferring entire record
sets to the browser.

Every dashboard query must:

- receive tenant context from the established trusted server boundary;
- include tenant filtering in the query itself;
- apply the same authorization/capability rules as the source module;
- return only fields required by the dashboard;
- avoid leaking record existence through counts, errors, cache keys, or timing
  differences where the existing architecture provides a mitigation;
- follow existing cache invalidation and revalidation conventions.

The UI must not accept a tenant identifier from an untrusted client parameter
as authority. Aggregated links must re-check record access at their destination.

## 8. Shared component behavior

Changed controls and surfaces share consistent states:

- default, hover, active, selected, focus-visible, disabled, and loading;
- skeletons that approximate final layout rather than generic pulsing boxes;
- empty states with a useful explanation and a permitted next action;
- actionable error messages with retry where retry is safe;
- stable layout during asynchronous transitions.

Forms retain persistent visible labels. Placeholder text is supplementary.
Errors identify the field, explain the correction, and are programmatically
associated. Tooltip content never replaces a required label.

Motion tokens align with the reference intent while preserving the existing
CRM token system:

- fast interaction: approximately `120–140ms`;
- standard transition: `180ms`;
- larger surface transition: approximately `260–280ms`.

Under `prefers-reduced-motion: reduce`, non-essential movement is removed and
state changes remain immediately understandable.

## 9. Localization and bidirectionality

Changed surfaces must be complete in Persian, English, and German. Hard-coded
English currently visible on Persian routes, including affected deals-page
labels, is moved to the translation system when touched by this phase.

The implementation verifies:

- localized labels, tooltips, accessible names, empty states, and errors;
- `Intl`-based number, date, relative-time, and currency formatting;
- explicit direction isolation for email, phone, identifier, amount, and URL
  content;
- directional icons only where meaning is directional;
- no blanket mirroring of product marks, status icons, or non-directional
  symbols.

## 10. Dashboard failure handling

The existing `/fa/crm` HTTP 500 is an implementation blocker and must be
root-caused before or alongside dashboard replacement. The failure must not be
hidden by a static client-only shell.

The implementation should distinguish:

- route/render failures;
- authentication or authorization failures;
- tenant-context failures;
- aggregate query failures;
- empty but valid datasets.

Expected empty data renders the designed empty state. Recoverable aggregate
failure renders a bounded panel error and retry when safe. Authorization
failure follows the established product behavior and must not reveal hidden
record counts. Unexpected server failures are logged through the existing
observability path with sensitive values excluded from UI messages.

## 11. Accessibility requirements

The phase is not complete unless it provides:

- a working skip link and stable main landmark;
- semantic headings and navigation names;
- visible focus on all interactive elements;
- keyboard operation for rail, drawer, contextual destinations, quick actions,
  and dashboard links;
- focus trapping and restoration for modal surfaces;
- 44-pixel pointer targets on mobile and rail controls;
- text equivalents for charts and status colors;
- live feedback for relevant asynchronous operations without excessive
  announcements;
- adequate contrast in light and dark themes;
- correct behavior at zoom and narrow viewport widths.

## 12. Verification matrix

### 12.1 Static and build checks

- TypeScript/typecheck;
- lint;
- relevant unit and integration tests;
- production build using the repository's documented Next.js version;
- no new unexpected console errors or hydration warnings.

### 12.2 Browser checks

Test at minimum:

- Persian RTL, English LTR, and German LTR;
- expanded and compact rail before and after reload;
- all four direction/state arrow combinations;
- mobile drawer open, close, Escape, focus trap, and route navigation;
- contextual destination overflow and active-item visibility;
- dashboard loading, populated, empty, partial-error, and retry states;
- light, dark, reduced-motion, keyboard-only, and responsive layouts;
- landing, workspace, and sign-in logo sizing without overflow;
- tenant and capability-sensitive dashboard actions.

Desktop and mobile visual baselines should be captured before implementation
and compared after implementation. Existing unrelated Next.js development
overlay noise must be separated from regressions introduced by this phase.

## 13. Acceptance criteria

The phase is accepted when:

1. Sobi CRM visibly belongs to the same Sobinta suite as Sobi Desk while its
   existing identity and navigation remain recognizable;
2. the rail is 210/72 pixels, persists its state, and uses correct arrows and
   accessible labels in RTL and LTR;
3. the `/[locale]/crm` dashboard loads without the current 500 error and shows
   real tenant-scoped operational information or a valid empty state;
4. landing, workspace, and sign-in logos meet the approved visual targets;
5. changed surfaces are localized and usable in Persian, English, and German;
6. mobile, dark mode, reduced motion, keyboard, and screen-reader semantics are
   verified;
7. existing routes, capabilities, authentication, and tenant isolation are
   unchanged except for necessary bug fixes that preserve their contracts;
8. static checks, relevant tests, production build, and browser smoke tests pass.

## 14. Explicit non-goals

- page-specific redesign of every CRM module;
- adopting Sobi Desk's blue palette or product identity;
- changing CRM information architecture or module ordering;
- replacing authentication, authorization, tenancy, persistence, or APIs with
  implementations from the reference archive;
- introducing fake dashboard data;
- combining Sobi Desk and Sobi CRM into one repository or runtime in this phase.

## 15. Design self-review

The main risk in this direction is creating a generic rounded-card SaaS
dashboard. The design avoids that by keeping the dark module rail as the CRM
signature, using copper only for consequential signals, prioritizing an
operational pipeline and follow-up workflow, and keeping cards quiet and
structural.

The second risk is visual alignment causing security or routing drift. The
reference is therefore restricted to presentation and interaction contracts;
all tenant, capability, route, and data boundaries remain native to Sobi CRM
and are explicit acceptance criteria.

The third risk is an oversized first phase. Page-specific redesign is deferred.
Shared foundations, the shell, dashboard, logos, and affected localization are
the bounded implementation target.
