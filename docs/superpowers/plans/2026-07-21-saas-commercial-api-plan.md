# SaaS Commercial, API, and Import Plan

1. Extend pricing plans and add tenant subscription, usage, and import models
   with forced RLS migrations.
2. Add provider-neutral subscription/entitlement and quota services with safe
   free-plan fallback and atomic metering.
3. Seed machine-readable plans and provision a trial subscription.
4. Centralize API-key request authentication, scopes, throttling, envelopes,
   request ids, and cursor pagination.
5. Add contact list/create REST operations and enforce plan quotas.
6. Add a bounded CSV contact-import service, private source storage, durable
   processing job, row-error summary, and status endpoint.
7. Add an OpenAPI contract and dependency-free TypeScript SDK.
8. Update deployment/security/testing and all three READMEs.
9. Run schema validation, unit tests, lint, typecheck, build, audit, and the RLS
   suite when Docker is available.

