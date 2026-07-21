# CRM Activity Trend Calendar Switch

## Goal

Allow Persian-language CRM dashboard users to switch only the activity-trend chart's date labels between Jalali and Gregorian calendars without changing the chart data, date range, or the application's global locale.

## Scope

- The control appears only on the main CRM dashboard activity-trend card.
- The control renders only when the active locale is Persian (`fa`).
- English, German, and any future non-Persian locale keep Gregorian labels and do not render the control.
- The setting affects only the activity-trend chart's horizontal-axis labels.

## Interaction Design

- Add a compact two-segment control to the left side of the activity-trend card header, in the location approved in the visual reference.
- Visual order is Gregorian on the left and Jalali on the right.
- Jalali is selected by default for Persian users.
- Selecting either segment updates the axis labels immediately without navigation or data refetching.
- The most recent choice is stored in browser-local storage and restored only when the Persian CRM dashboard is opened again.
- The two segments use button semantics, expose their selected state to assistive technology, and show a visible keyboard focus indicator.

## Visual Design

- Use the approved segmented option A.
- Keep the control visually subordinate to the card title: compact typography, semantic surface and border tokens, and the existing CRM teal color for the selected segment.
- Preserve contrast and selected/focus states in light and dark themes.
- On narrow layouts, the title remains the primary header content and the switch stays compact without overlapping or truncating it.

## Architecture

- Keep the CRM dashboard server-rendered.
- Add a small client component responsible for calendar preference and rendering the existing activity chart.
- Pass the existing activity data and locale-independent labels into that client boundary as serializable props.
- Reuse the existing Jalali/Gregorian formatting utilities where possible; do not duplicate calendar conversion logic.
- Use a stable, namespaced local-storage key specific to the CRM activity chart.

## Data and Security

- The switch is presentation-only and performs no database writes, server actions, API requests, or tenant mutations.
- Existing activity data, authorization, RLS, and the 14-day query remain unchanged.
- Invalid or unavailable local-storage values fall back to Jalali in Persian.

## Testing and Acceptance Criteria

- In Persian, the control is visible with Jalali selected on first use.
- Clicking Gregorian changes every horizontal-axis date label to Gregorian while chart values remain unchanged.
- Clicking Jalali restores Jalali labels.
- Refreshing the Persian dashboard restores the last valid choice.
- In English and German, the control is absent and labels remain Gregorian.
- The control works by mouse and keyboard and communicates the selected state accessibly.
- The layout is verified at 375, 1024, and 1440 pixel widths in light and dark themes.
- Lint, type checking, focused tests, and the production build pass.
