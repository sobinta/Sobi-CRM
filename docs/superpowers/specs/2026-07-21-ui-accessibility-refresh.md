# UI and Accessibility Refresh

## Subject and job

SOBI is a multilingual operating console for teams managing customer data.
The interface's single job is to make dense operational state feel calm,
traceable, and safe to act on across desktop, mobile, LTR, and RTL.

## Design system

- **Viridian rail** (`brand-600`/`brand-950`): stable navigation and trust.
- **Warm paper surfaces** (`gray-0`/`gray-50`): long-session readability.
- **Copper signal** (`accent-500`): reserved for consequential progress/KPIs.
- **Semantic status colors**: always paired with text or icon, never alone.
- **Type:** Hanken Grotesk for UI, IBM Plex Mono for identifiers/data,
  Vazirmatn for Persian. Mobile control text starts at 16 px; dense desktop UI
  may step down to 14 px.

## Layout and signature

The persistent workspace rail remains the product signature: it represents
the tenant's activated business surfaces rather than generic app navigation.
The refresh spends its visual emphasis there and on a thin, legible status
spine in operational views; cards, tables, and forms remain quiet.

```text
desktop  [workspace rail][top bar / context tabs][operational canvas]
mobile   [top bar + drawer]                   [single-column canvas]
import   [bounded source step]                [durable status ledger]
```

## Self-critique before build

An earlier direction risked becoming another rounded-card SaaS dashboard.
The revision removes decorative gradients and extra motion. Distinction comes
from the workspace rail, warm-neutral data surfaces, mono data rhythm, and the
source-to-status import ledger—structures that describe this CRM's work.

## Quality floor

Skip navigation, visible focus, inert closed drawers, Escape dismissal,
44-pixel mobile targets, 16-pixel mobile fields, reduced motion, semantic
tables, live async feedback, Intl date formatting, dark-mode color scheme,
and labeled/autofill-friendly public forms are required.
