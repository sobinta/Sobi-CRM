# SaaS Reliability Design

**Date:** 2026-07-21
**Status:** Approved for implementation

## Goal

Remove the remaining single-process assumptions from rate limiting, events,
webhook delivery, jobs, and file storage while keeping local development
usable without external infrastructure.

## Operating modes

- Development and tests may use the in-memory rate limiter and local disk.
- Docker Compose exposes PostgreSQL, Redis, Mailpit, and MinIO for full local
  integration testing.
- Production fails startup validation unless Redis and S3-compatible object
  storage are configured. Production never silently falls back to process
  memory or ephemeral local disk.

## Distributed rate limiting

The public `limit()` contract becomes asynchronous. A Redis implementation
uses one atomic Lua operation per fixed window and stores only the existing
SHA-256 opaque keys. Redis TTL controls cleanup. The memory implementation is
kept for development and unit tests.

If Redis is selected and unavailable, rate limiting fails closed. Callers get
an unavailable result and return a stable 503 response/action result rather
than accepting unbounded traffic.

## PostgreSQL job queue

The existing `Job` table remains the durable queue. Claiming changes to a
single `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED) ... RETURNING`
statement. A bounded lease allows another worker to recover jobs left in
`RUNNING` by a crashed process. Retries use capped exponential backoff with
jitter, errors are truncated, and a stable job id remains the idempotency key.

This avoids introducing a second queue system while retaining horizontal
worker safety. Redis is used only for rate limiting, not as the source of truth
for business work.

## Durable event outbox

`Event` becomes the outbox record by adding `dispatchedAt`. Publishing first
persists the event, then enqueues one deduplicated job per named durable
consumer and finally marks it dispatched. The job tick repairs any event left
without `dispatchedAt`, so a failure between those steps is recoverable.

The current durable consumers are:

- `automation`: executes matching automations;
- `webhooks`: creates one durable delivery per subscribed endpoint.

In-process fan-out is removed for these consumers. Worker bootstrap owns their
registration, so route placement or which web process handled a request can no
longer lose the side effect.

## Idempotency and webhook delivery

Event-triggered `AutomationRun` rows carry `eventId` and are unique per
automation/event. A retry skips an already recorded run.

`WebhookDelivery` stores one row per webhook/event and has its own job. The
delivery id is sent as `X-Sobi-Delivery`; retries keep that id stable so a
receiver can deduplicate at-least-once delivery. Only a 2xx response succeeds.
Timeouts, network failures, and non-2xx responses retry through the job queue.

## Object storage

The existing provider interface remains. `local` is the development default;
`s3` uses an S3-compatible API and supports AWS S3, MinIO, and compatible
providers. Production startup validation requires the S3 driver and validates
bucket, region, credentials, and endpoint rules. Object keys remain tenant
scoped and downloads continue through the permission-checked application
route.

Malware scanning is a separate deployment integration point: uploads are
already allowlisted and magic-byte checked, but production documentation will
require an antivirus/quarantine service before regulated or untrusted binary
workloads are enabled.

## Database isolation

New tenant tables and relationships receive forced RLS and composite
same-tenant foreign keys in the migration. The existing RLS integration suite
will discover them from Prisma metadata automatically.

## Verification

- unit tests for Redis/memory rate-limit behavior and retry calculations;
- unit tests for storage selection and S3 configuration;
- event consumer and webhook idempotency tests at the pure/helper boundary;
- full test, lint, typecheck, production build, and npm audit;
- PostgreSQL/RLS integration tests when Docker is available.

