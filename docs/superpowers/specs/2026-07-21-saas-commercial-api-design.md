# SaaS Commercial, API, and Import Design

**Date:** 2026-07-21
**Status:** Approved for implementation

## Commercial model

`PricingPlan` remains the public catalog but gains machine-readable
entitlements and limits. `TenantSubscription` is the tenant's current billing
state and stores provider-neutral external identifiers, trial/current-period
dates, cancellation state, and status. Payment-provider adapters translate
provider events into this model; business code never depends on Stripe or a
specific regional PSP.

Local development uses the `manual` provider. Production may use manual
invoicing until a payment adapter is configured; this must be explicit and is
not presented as automated billing.

## Entitlements and quotas

Entitlements resolve from the current active/trialing subscription and its
plan. Existing tenant feature grants remain overrides for controlled rollout.
Limits are named metrics (`contacts`, `members`, `storageBytes`,
`apiRequestsMonthly`, `aiTokensMonthly`, and similar) rather than columns, so
plans can evolve without repeated schema migrations.

`UsageCounter` stores period-bounded mutable consumption for metered actions.
Atomic database updates enforce counters under concurrency. Record-count
quotas use tenant-filtered counts immediately before mutation. A missing or
invalid subscription resolves to the conservative free-plan limits, never an
unlimited default.

## Public API and SDK contract

API-key authentication, scopes, Redis throttling, and tenant re-entry are
centralized. REST responses use stable `{data, meta?, error?}` envelopes,
cursor pagination, bounded page sizes, request ids, and machine-readable error
codes. Contacts receive list/create endpoints first; the pattern is reusable
for other CRM resources.

An OpenAPI document is the source contract. A small dependency-free TypeScript
SDK wraps authentication, pagination, errors, and contact operations. The SDK
contains no server secrets and can be published independently later.

## Import pipeline

Imports are asynchronous jobs, never large request-bound database loops. The
request validates a bounded CSV upload, stores the source privately, records
an `ImportRun`, and queues processing. Mapping is explicit and allowlisted.
Rows are validated with the same contact schema as the API; batches are
tenant-scoped, quota-aware, and collect bounded row errors. Import status and
summary remain queryable without exposing the source object directly.

CSV parsing rejects dangerous size/column/row counts and does not execute
spreadsheet formulas. Export paths continue to escape formula-prefixed cells.

## Isolation and verification

Subscription, usage, and import tables are tenant-scoped with forced RLS.
Global plan access remains behind the audited system capability. Unit tests
cover plan resolution, quota decisions, cursor contracts, CSV parsing, and SDK
errors; PostgreSQL tests cover atomic usage and cross-tenant isolation when
Docker is available.

