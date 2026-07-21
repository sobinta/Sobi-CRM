# Public Read-Only Demo Implementation Plan

**Design:** `docs/superpowers/specs/2026-07-21-public-read-only-demo-design.md`

## Objective

Replace the broken client-side shared demo credential with a production-safe,
server-owned demo entry flow. Provision a dedicated fictional tenant and user,
derive an explicit read-only access mode from the demo role, reject all server
and database mutations, and provide representative non-persistent UI
simulations.

## Task 1: Model read-only request context

**Files**

- Modify: `src/core/tenancy/context.ts`
- Modify: `src/core/tenancy/errors.ts`
- Modify: `src/core/auth/session.ts`
- Modify: `src/core/tenancy/context.test.ts`
- Modify: context fixtures found by `rg "PlatformContext" src`

**Work**

1. Add an `AccessMode` type with `read-write` and `read-only` values.
2. Make `accessMode` a required immutable field of `PlatformContext`.
3. Ensure public/system contexts remain read-write.
4. Include role keys while resolving memberships and derive read-only only from
   the stable demo viewer role key on the server.
5. Add a typed `ReadOnlyContextError` without leaking identity information.

**Verification**

- Unit-test immutable access mode and role-derived context.
- Run `npm run typecheck` to find and update every context fixture.

## Task 2: Enforce a database write barrier

**Files**

- Modify: `src/core/db.ts`
- Modify: `src/core/tenancy/tenant-query.ts`
- Modify: `src/core/db.test.ts`

**Work**

1. Export a read-operation classifier for Prisma model operations.
2. In the tenant Prisma extension, reject all non-read model operations before
   tenant scoping or SQL when the context is read-only.
3. Reject all raw operations for read-only contexts. This deliberately blocks
   raw reads too because a data-modifying CTE can be issued through query-raw.
4. Keep normal tenant scoping and PostgreSQL RLS unchanged for permitted reads.

**Verification**

- Cover create, createMany, update, updateMany, delete, upsert, executeRaw, and
  queryRaw rejection.
- Confirm model `findMany`, count, aggregate, and groupBy remain permitted.
- Confirm the query function is never invoked for a rejected operation.

## Task 3: Reject demo mutations at action/API boundaries

**Files**

- Modify: `src/core/auth/action-context.ts`
- Modify: server action callers that use `withActionContext` for reads
- Add: `src/core/auth/action-context.test.ts` or focused guard tests

**Work**

1. Add an explicit action intent (`read` or `write`), defaulting to write.
2. Reject write intent before the callback runs for read-only sessions.
3. Mark genuine read-only actions such as notification loads and searches with
   read intent.
4. Preserve existing permission checks and treat every Server Action as a
   separately reachable endpoint.

**Verification**

- Test that read callbacks run and write callbacks never run in demo context.
- Run the existing action/service unit suite.

## Task 4: Add explicit public-demo configuration

**Files**

- Add: `src/core/demo/constants.ts`
- Add: `src/core/demo/config.ts`
- Modify: `.env.example`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `src/core/security/environment.ts`
- Modify: corresponding environment tests

**Work**

1. Add stable, non-secret demo tenant/role identifiers.
2. Read `PUBLIC_DEMO_ENABLED`, `DEMO_LOGIN_EMAIL`, and
   `DEMO_LOGIN_PASSWORD` only from a server-only config module.
3. Require a non-placeholder 32+ character demo password when public demo is
   enabled in production.
4. Document explicit provisioning and default the public demo to disabled.

**Verification**

- Test enabled/disabled and unsafe-production configurations.
- Confirm no secret uses a `NEXT_PUBLIC_` prefix.

## Task 5: Provision the dedicated demo identity and tenant

**Files**

- Add: `src/core/demo/provision-demo.ts`
- Add: `scripts/provision-demo.ts`
- Add: `src/core/demo/provision-demo.test.ts`
- Modify: `package.json`
- Reuse/refactor fictional data builders from `prisma/seed.ts` only where safe

**Work**

1. Upsert the demo User and credential Account using Better Auth's configured
   password hasher; never hand-roll credential hashing.
2. Upsert a tenant by the stable demo slug and a non-admin demo viewer role
   containing only explicit read grants.
3. Upsert the membership and role binding and prevent the demo identity from
   being a super admin.
4. Seed fictional records into this tenant by stable identifiers. Do not attach
   demo data to the first customer tenant.
5. Enable only product modules safe for public exploration.
6. Make the command idempotent and print identifiers, never credentials.

**Verification**

- Run provisioning twice and compare resource counts and stable IDs.
- Confirm no non-demo tenant changes.

## Task 6: Implement the server-owned demo entry route

**Files**

- Add: `src/app/api/demo/session/route.ts`
- Add: `src/core/demo/demo-entry.ts`
- Add: focused route/service tests
- Modify: `src/core/auth/demo-login.ts`
- Modify: `src/app/[locale]/landing/demo-cta-button.tsx`
- Modify: `src/app/[locale]/(auth)/login/login-form.tsx`

**Work**

1. Accept only POST and verify same-origin request metadata.
2. Fail closed when demo mode is disabled or provisioning is incomplete.
3. Apply the existing distributed rate limiter using a hashed client IP key.
4. Call `auth.api.signInEmail` on the server with server-only credentials,
   `rememberMe: false`, request headers, and `asResponse: true` so Better Auth
   owns session creation and Set-Cookie behavior.
5. Return a generic localized-safe status without revealing identity existence.
6. Replace all client credential calls with a POST to this route followed by a
   full-document localized redirect.

**Verification**

- Inspect the built client bundle for the demo email/password.
- Test success, disabled, rate-limited, and missing-provisioning responses.

## Task 7: Propagate demo state and restrict the shell

**Files**

- Modify: `src/components/layout/session-context.tsx`
- Modify: `src/app/[locale]/(app)/layout.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/workspaces-context.tsx`
- Modify: `src/core/module-registry/compose.ts`
- Add: `src/components/demo/demo-status-bar.tsx`
- Modify: translations in `src/i18n/messages/{en,de,fa}.json`

**Work**

1. Pass only the boolean read-only/demo state to Client Components.
2. Show a persistent localized demo status with an exit action.
3. Hide tenant switching, platform/admin workspaces, billing, integrations,
   imports, exports, uploads, and unsafe external actions.
4. Keep read authorization server-side; UI hiding is only a UX layer.

**Verification**

- Unit-test workspace composition for demo and normal users.
- Browser-test desktop/mobile and RTL/LTR demo indicators and navigation.

## Task 8: Add a shared non-persistent simulation layer

**Files**

- Add: `src/components/demo/demo-mode-provider.tsx`
- Add: `src/components/demo/use-demo-simulation.ts`
- Add: reusable localized demo feedback component/toast
- Modify: representative contact, lead, deal, and task interaction components

**Work**

1. Validate demo forms with the same client schemas/UI constraints.
2. In demo mode, update component memory only and never call a Server Action or
   mutation API.
3. Mark temporary items as demo-only and announce the result accessibly.
4. Reset simulated state on navigation/reload.
5. For unsupported mutation controls, show the localized non-persistence
   explanation rather than failing silently.

**Verification**

- Component/unit-test simulation and reset behavior.
- In an end-to-end walkthrough, assert zero mutation requests and unchanged DB
  counts/checksums.

## Task 9: Security regression suite

**Files**

- Extend: `src/core/tenancy/rls.integration.test.ts`
- Add: demo read-only integration tests
- Add/update: browser flow tests or scripted Playwright checks

**Work**

1. Prove cross-tenant reads remain impossible.
2. Attempt every Prisma mutation family under a demo context.
3. Invoke representative Server Actions directly as a demo user.
4. Verify integrations/jobs/uploads/exports cannot be reached.
5. Snapshot DB counts before and after a full demo walkthrough.

**Verification commands**

```text
npm run lint
npm run typecheck
npm test
npm run test:rls
npm run build
```

## Task 10: Local verification and handoff

1. Provision the demo workspace locally through the new command.
2. Start the app and enter from landing, hero, CTA banner, mobile tab bar, and
   login page.
3. Browse exposed modules and exercise each representative simulation.
4. Confirm refresh clears simulated data and direct server writes fail.
5. Leave the local preview running and report the exact rollback tag/commit,
   test results, and public-demo deployment requirements.
