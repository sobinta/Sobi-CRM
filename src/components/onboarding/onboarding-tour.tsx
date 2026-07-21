"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { localeMeta, type AppLocale } from "@/i18n/routing";
import {
  DASHBOARD_TOUR_STEPS,
  demoTourStorageKey,
  findAvailableStep,
  positionTourPanel,
} from "@/core/onboarding/tour-config";
import {
  finishDashboardTourAction,
  resetDashboardTourAction,
} from "@/app/[locale]/(app)/tour-actions";

interface TourContextValue {
  replay: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useOnboardingTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) throw new Error("useOnboardingTour must be used inside OnboardingTourProvider");
  return context;
}

type TargetRect = Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">;

export function OnboardingTourProvider({
  children,
  initialCompleted,
  tenantId,
  demo,
}: {
  children: ReactNode;
  initialCompleted: boolean;
  tenantId: string;
  demo: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const direction = localeMeta[locale].dir;
  const t = useTranslations("onboardingTour");
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const storageKey = useMemo(() => demoTourStorageKey(tenantId), [tenantId]);

  const targetExists = useCallback(
    (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
    },
    [],
  );

  const openAtFirstAvailable = useCallback(() => {
    const first = findAvailableStep(DASHBOARD_TOUR_STEPS, 0, 1, targetExists);
    if (first === null) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setStepIndex(first);
    setActive(true);
  }, [targetExists]);

  useEffect(() => {
    if (pathname !== "/crm") return;
    const timer = window.setTimeout(() => {
      let done = initialCompleted;
      if (demo) {
        try {
          done = window.localStorage.getItem(storageKey) === "done";
        } catch {
          done = false;
        }
      }
      if (!done) openAtFirstAvailable();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [demo, initialCompleted, openAtFirstAvailable, pathname, storageKey]);

  const close = useCallback(
    (outcome: "completed" | "skipped") => {
      setActive(false);
      setTargetRect(null);
      if (demo) {
        try {
          window.localStorage.setItem(storageKey, "done");
        } catch {
          // Private browsing may reject storage; the tour still closes safely.
        }
      } else {
        startTransition(() => finishDashboardTourAction(outcome));
      }
      window.setTimeout(() => previousFocusRef.current?.focus(), 0);
    },
    [demo, storageKey],
  );

  const replay = useCallback(() => {
    if (demo) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Continue with in-memory replay.
      }
    } else {
      startTransition(() => resetDashboardTourAction());
    }
    openAtFirstAvailable();
  }, [demo, openAtFirstAvailable, storageKey]);

  const move = useCallback(
    (directionDelta: 1 | -1) => {
      const next = findAvailableStep(
        DASHBOARD_TOUR_STEPS,
        stepIndex + directionDelta,
        directionDelta,
        targetExists,
      );
      if (next === null) {
        if (directionDelta === 1) close("completed");
        return;
      }
      setStepIndex(next);
    },
    [close, stepIndex, targetExists],
  );

  useEffect(() => {
    if (!active) return;
    const selector = DASHBOARD_TOUR_STEPS[stepIndex]?.target;
    const target = selector ? document.querySelector<HTMLElement>(selector) : null;
    if (!target || !targetExists(selector)) {
      const timer = window.setTimeout(() => move(1), 0);
      return () => window.clearTimeout(timer);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    const measure = () => setTargetRect(target.getBoundingClientRect());
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, move, stepIndex, targetExists]);

  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close("skipped");
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, close, stepIndex]);

  const panelPosition = targetRect
    ? positionTourPanel(
        targetRect,
        { width: window.innerWidth, height: window.innerHeight },
        { width: Math.min(360, window.innerWidth - 32), height: 260 },
        direction,
      )
    : null;
  const step = DASHBOARD_TOUR_STEPS[stepIndex];
  const availableStepIndexes = active
    ? DASHBOARD_TOUR_STEPS.map((candidate, index) =>
        targetExists(candidate.target) ? index : -1,
      ).filter((index) => index >= 0)
    : [];
  const currentVisibleStep = availableStepIndexes.indexOf(stepIndex) + 1;

  return (
    <TourContext.Provider value={{ replay, active }}>
      {children}
      {active && targetRect && step && panelPosition && (
        <>
          <div className="fixed inset-0 z-50" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-60 rounded-xl border-2 border-brand shadow-[0_0_0_9999px_color-mix(in_oklab,var(--color-surface-rail)_62%,transparent),0_0_0_4px_color-mix(in_oklab,var(--color-brand)_22%,transparent)] motion-reduce:transition-none"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-tour-title"
            aria-describedby="onboarding-tour-description"
            dir={direction}
            className="fixed z-70 w-[calc(100vw-2rem)] max-w-[360px] rounded-2xl border border-line-strong bg-surface-overlay p-5 shadow-overlay"
            style={{
              top: panelPosition.top,
              insetInlineStart: panelPosition.inlineStart,
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-subtle-ink">
                {t("progress", {
                  current: Math.max(1, currentVisibleStep),
                  total: availableStepIndexes.length,
                })}
              </span>
              <button
                type="button"
                onClick={() => close("skipped")}
                className="min-h-8 rounded-md px-2 text-xs font-medium text-ink-faint hover:bg-surface-sunken hover:text-ink"
              >
                {t("skip")}
              </button>
            </div>
            <h2 id="onboarding-tour-title" className="text-lg font-bold text-ink">
              {t(`steps.${step.id}.title`)}
            </h2>
            <p id="onboarding-tour-description" className="mt-2 text-sm leading-6 text-ink-muted">
              {t(`steps.${step.id}.description`)}
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => move(-1)}
                disabled={findAvailableStep(DASHBOARD_TOUR_STEPS, stepIndex - 1, -1, targetExists) === null}
              >
                {t("back")}
              </Button>
              <Button variant="primary" size="sm" onClick={() => move(1)}>
                {findAvailableStep(DASHBOARD_TOUR_STEPS, stepIndex + 1, 1, targetExists) === null
                  ? t("finish")
                  : t("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </TourContext.Provider>
  );
}
