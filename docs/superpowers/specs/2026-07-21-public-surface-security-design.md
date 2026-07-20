# Public Surface Security Design

**Date:** 2026-07-21  
**Status:** Approved by the user's instruction to continue the agreed sequence

## Scope

Harden the externally reachable surfaces that remain after tenant isolation:
outbound webhooks, file upload/download, API keys, public lead intake, public
contract acceptance, runtime secrets, browser policy, and vulnerable packages.

## Decisions

### Webhooks

- Accept only absolute HTTP(S) URLs without credentials; production defaults
  to HTTPS only.
- Resolve DNS immediately before every delivery and reject every private,
  loopback, link-local, multicast, unspecified, carrier-grade NAT, and cloud
  metadata destination (IPv4 and IPv6).
- Pin the validated address into the outbound socket lookup to close the DNS
  rebinding gap while retaining the original hostname for TLS/SNI.
- Never follow redirects. Use short connect/request timeouts and bounded
  response handling. Revalidate stored URLs on every send, not only creation.
- Private-network webhooks require an explicit development-only environment
  override; they are not silently enabled in production.

### Files

- Reject empty, oversized, dangerous-extension, HTML/SVG/scriptable, and
  MIME/magic-byte-mismatched uploads before buffering or persistence.
- Start with a conservative allowlist: PDF, JPEG, PNG, WebP, plain text, CSV,
  DOCX, and XLSX. Office files must have ZIP signatures.
- Generate storage keys server-side, enforce resolved paths remain under the
  storage root, and delete stored bytes when the metadata transaction fails.
- Authenticated downloads remain tenant/RBAC protected and are served as
  attachments with `nosniff`; signing helpers require real production secrets.
- Malware scanning and S3 quarantine are required before arbitrary public
  uploads; this phase exposes a provider seam and documents the production
  constraint.

### API keys and abuse controls

- Normalize scopes (`contacts:read`, wildcard forms) and deny routes unless the
  verified key explicitly grants the required scope.
- Rate-limit using a hash of the credential, never raw key fragments in map or
  log identifiers.
- Apply bounded schemas and per-IP/tenant-or-token throttles to public lead and
  contract actions. Responses stay enumeration-resistant.
- In-memory limiting is an honest single-instance control; the next reliability
  phase replaces it with Redis without changing call sites.

### Contracts

- Public tokens remain random 192-bit values but receive an explicit expiry.
- Sending refreshes the expiry; all public view/read/accept paths require an
  unexpired token and use conditional updates for idempotency/race safety.
- Acceptance rate limiting is keyed by token hash and client address.

### Secrets, browser policy, dependencies

- Production startup rejects missing, placeholder, or undersized auth, file,
  encryption, and internal-job secrets, and insecure public base URLs.
- Remove permissive production script policy where Next.js permits it; follow
  this repository's installed Next 16 documentation before changing CSP.
- Apply non-breaking audited dependency fixes first. Major or framework
  downgrades suggested by automated audit tooling are rejected; unresolved
  advisories are documented with exposure and compensating controls.

## Verification

- Unit tests cover IP classification, pinned webhook rejection, file
  signatures/limits, API scopes, contract expiry helpers, and secret policy.
- Existing unit, lint, typecheck, and production build remain green.
- Security tests must not contact arbitrary network destinations.
- Package audit is recorded after lockfile updates.
