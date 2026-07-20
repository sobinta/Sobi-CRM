# SaaS Reliability Implementation Plan

1. Add Redis and S3 dependencies plus local Redis/MinIO services.
2. Replace the synchronous memory-only limiter with provider-backed async rate
   limiting and update all public callers.
3. Harden job claiming, leases, retries, and stale-worker recovery.
4. Convert the event bus to a durable outbox with named consumer jobs and
   repair of undispatched events.
5. Make automation execution idempotent and webhook delivery durable,
   independently retryable, and observable.
6. Add S3-compatible storage while retaining local development storage.
7. Add the Prisma migration, forced RLS, and same-tenant integrity constraints.
8. Extend production environment validation and deployment/security/testing
   documentation.
9. Run unit tests, lint, typecheck, production build, dependency audit, and RLS
   integration tests when the local Docker daemon is available.

