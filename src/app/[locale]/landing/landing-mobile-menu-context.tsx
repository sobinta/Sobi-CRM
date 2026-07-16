"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface LandingMobileMenuState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const LandingMobileMenuContext = createContext<LandingMobileMenuState | null>(null);

/** Shared open/close state for the landing page's mobile nav panel, so both
 * the top hamburger and the bottom tab bar's "Menu" button drive the same panel. */
export function LandingMobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <LandingMobileMenuContext.Provider
      value={{
        open,
        toggle: () => setOpen((o) => !o),
        close: () => setOpen(false),
      }}
    >
      {children}
    </LandingMobileMenuContext.Provider>
  );
}

export function useLandingMobileMenu(): LandingMobileMenuState {
  const ctx = useContext(LandingMobileMenuContext);
  if (!ctx) {
    throw new Error("useLandingMobileMenu must be used within LandingMobileMenuProvider");
  }
  return ctx;
}
