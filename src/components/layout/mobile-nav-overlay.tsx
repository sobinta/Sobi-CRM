"use client";

import type { ReactNode } from "react";
import { useMobileNav } from "./mobile-nav-context";
import { cn } from "@/lib/utils";

/** Slide-in drawer showing the module rail + sidebar on mobile (below `lg`). */
export function MobileNavOverlay({ children }: { children: ReactNode }) {
  const { open, close } = useMobileNav();

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
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
