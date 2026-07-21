export const DASHBOARD_TOUR_KEY = "dashboard-introduction";
export const DASHBOARD_TOUR_VERSION = 1;

export interface TourStepDefinition {
  id: string;
  target: string;
}

export const DASHBOARD_TOUR_STEPS: TourStepDefinition[] = [
  { id: "dashboard", target: '[data-tour="dashboard-overview"]' },
  { id: "rail", target: '[data-tour="module-rail"]' },
  { id: "navigation", target: '[data-tour="context-navigation"]' },
  { id: "search", target: '[data-tour="global-search"]' },
  { id: "calendar", target: '[data-tour="calendar-entry"]' },
  { id: "forms", target: '[data-tour="form-entry"]' },
  { id: "support", target: '[data-tour="support-entry"]' },
  { id: "profile", target: '[data-tour="profile-entry"]' },
];

export function tourIsDone(progress: {
  version: number;
  completedAt: Date | string | null;
  skippedAt: Date | string | null;
} | null, expectedVersion = DASHBOARD_TOUR_VERSION): boolean {
  return Boolean(
    progress &&
      progress.version === expectedVersion &&
      (progress.completedAt || progress.skippedAt),
  );
}

export function demoTourStorageKey(
  tenantId: string,
  tourKey = DASHBOARD_TOUR_KEY,
  version = DASHBOARD_TOUR_VERSION,
): string {
  return `sobi:onboarding:${tenantId}:${tourKey}:v${version}`;
}

export function findAvailableStep(
  steps: TourStepDefinition[],
  fromIndex: number,
  direction: 1 | -1,
  hasTarget: (selector: string) => boolean,
): number | null {
  for (
    let index = fromIndex;
    index >= 0 && index < steps.length;
    index += direction
  ) {
    if (hasTarget(steps[index].target)) return index;
  }
  return null;
}

export interface TourPanelPosition {
  top: number;
  inlineStart: number;
  placement: "before" | "after" | "below";
}

/** Pure, direction-aware placement kept separate for deterministic tests. */
export function positionTourPanel(
  target: Pick<DOMRect, "top" | "bottom" | "left" | "right">,
  viewport: { width: number; height: number },
  panel: { width: number; height: number },
  direction: "ltr" | "rtl",
): TourPanelPosition {
  const gap = 16;
  const edge = 16;
  const fitsAfter =
    direction === "ltr"
      ? target.right + gap + panel.width <= viewport.width - edge
      : target.left - gap - panel.width >= edge;
  const fitsBefore =
    direction === "ltr"
      ? target.left - gap - panel.width >= edge
      : target.right + gap + panel.width <= viewport.width - edge;

  const clampTop = Math.min(
    Math.max(edge, target.top),
    Math.max(edge, viewport.height - panel.height - edge),
  );

  if (fitsAfter) {
    return {
      top: clampTop,
      inlineStart: direction === "ltr" ? target.right + gap : viewport.width - target.left + gap,
      placement: "after",
    };
  }
  if (fitsBefore) {
    return {
      top: clampTop,
      inlineStart: direction === "ltr" ? target.left - gap - panel.width : viewport.width - target.right - gap - panel.width,
      placement: "before",
    };
  }

  return {
    top: Math.min(target.bottom + gap, Math.max(edge, viewport.height - panel.height - edge)),
    inlineStart: edge,
    placement: "below",
  };
}
