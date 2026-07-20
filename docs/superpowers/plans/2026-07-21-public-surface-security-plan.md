# Public Surface Security Implementation Plan

1. Add tested outbound URL/IP policy and pinned webhook transport; validate on
   creation and delivery.
2. Add tested upload policy, size-first action validation, safe local paths,
   cleanup on metadata failure, and production-secret enforcement.
3. Add API-scope matching and hashed throttling keys; harden public lead and
   contract actions with bounded input and per-client limits.
4. Add contract-token expiry schema/migration and conditional public flows.
5. Add production environment self-checks and tighten browser policy according
   to the installed Next.js 16 guidance.
6. Apply safe dependency updates, run audit, unit tests, lint, typecheck, and a
   clean production build; document residual risks.
