# Roadmap

The current build is a complete, verified foundation. Architecture for the
following is in place (schemas, interfaces, extension points) and documented;
implementation is the next step.

## Platform
- **Plugin SDK** — the module manifest is already a plugin-shaped contract
  (nav, widgets, permissions, commands, relationship kinds, AI employees). Ship
  the loader, lifecycle, and sandbox.
- **Marketplace** — item taxonomy + JSON template export/import already define
  the format; add the storefront and install flow.
- **SaaS billing** — `Plan` / feature-gating / self-onboarding exist; wire a
  Stripe adapter, trials, and usage limits.
- **Semantic search & RAG** — the `SearchProvider` interface has a pgvector
  seam; add embeddings + a knowledge base.

## AI
- Knowledge Base + RAG, AI Memory, multi-step tool-calling **agents**, and
  per-module **AI Employees** (schema present) with collaboration.
- Node-canvas automation builder (linear recipes ship today).

## Integrations
- OAuth adapters (Google, Microsoft) and provider implementations for WhatsApp,
  Telegram, Stripe, PayPal, banking, and government APIs (stubs + framework
  present); e-signature and document OCR.

## Client-facing
- Full customer **portal accounts** (public forms, booking, and status links
  ship today), website lead capture widgets, and a mobile app (the PWA shell and
  responsive layouts are in place; add offline sync + push).

## Observability
- OpenTelemetry tracing/profiling (structured logging + a health dashboard from
  real signals ship today).
