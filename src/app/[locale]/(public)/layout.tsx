import type { ReactNode } from "react";

/**
 * Minimal chrome for public (unauthenticated) portal pages. Deliberately no
 * width constraint here — pages differ a lot (a narrow lead-capture form vs.
 * a full-width contract document), so each page owns its own container.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-surface-sunken">{children}</div>;
}
