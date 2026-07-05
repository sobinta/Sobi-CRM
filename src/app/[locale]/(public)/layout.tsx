import type { ReactNode } from "react";

/** Minimal chrome for public (unauthenticated) portal pages. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-sunken">
      <div className="mx-auto max-w-lg px-4 py-12">{children}</div>
    </div>
  );
}
