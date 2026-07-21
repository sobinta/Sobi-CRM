# CRM Activity Calendar Switch Implementation Plan

1. Extract explicit Jalali/Gregorian activity-label formatting into a small client-safe utility and cover it with focused unit tests.
2. Add a dedicated client panel that owns the browser-local preference, renders the approved segmented control only for Persian, and delegates chart rendering to the existing Recharts component.
3. Replace the existing activity card header/chart composition with the client panel while keeping dashboard data loading in the Server Component.
4. Add localized accessible labels and verify locale parity.
5. Test Persian switching and persistence, confirm the control is absent in English/German, and visually inspect light/dark layouts at target widths.
6. Run lint, typecheck, unit tests, and production build; commit the completed feature.
