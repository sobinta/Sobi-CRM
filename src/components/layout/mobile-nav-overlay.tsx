"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useMobileNav } from "./mobile-nav-context";
import { cn } from "@/lib/utils";

/** Slide-in drawer showing the module rail + sidebar on mobile (below `lg`). */
export function MobileNavOverlay({ children }: { children: ReactNode }) {
  const { open, close } = useMobileNav();
  const t = useTranslations("shell");
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialog) return;

      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((item) => !item.hasAttribute("inert"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open, close]);

  return (
    <div className="lg:hidden">
      {open && (
        <button
          type="button"
          aria-label={t("closeMenu")}
          onClick={close}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}
      <div
        ref={dialogRef}
        id="mobile-primary-navigation"
        role="dialog"
        aria-modal="true"
        aria-label={t("mobileNav")}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex transition-[transform,opacity] duration-(--motion-base) motion-reduce:transition-none",
          open
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-full opacity-0 rtl:translate-x-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
