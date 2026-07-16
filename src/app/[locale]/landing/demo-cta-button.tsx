"use client";

import { useTransition, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { signInDemoAndRedirect } from "@/core/auth/demo-login";

/** Shared "enter the demo workspace" button — used in the nav, hero, and CTA banner. */
export function DemoCtaButton({
  className,
  pendingLabel,
  children,
}: {
  className?: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await signInDemoAndRedirect(locale);
    });
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
