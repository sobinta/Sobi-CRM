"use client";

import { useEffect, type ReactNode } from "react";
import { useMobileNav } from "./mobile-nav-context";
import { cn } from "@/lib/utils";

/** Slide-in drawer showing the module rail + sidebar on mobile (below `lg`). */
export function MobileNavOverlay({ children }: { children: ReactNode }) {
  const { open, close } = useMobileNav();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <div className="lg:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
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
