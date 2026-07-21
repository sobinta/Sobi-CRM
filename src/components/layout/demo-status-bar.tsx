"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSessionUser } from "./session-context";

export function DemoStatusBar() {
  const t = useTranslations("shell");
  const user = useSessionUser();
  if (user.accessMode !== "read-only") return null;

  return (
    <div
      role="status"
      className="flex min-h-9 shrink-0 items-center justify-center gap-2 border-b border-brand/25 bg-brand-subtle px-3 py-1.5 text-center text-xs font-medium text-brand-subtle-ink"
    >
      <Eye aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{t("demoStatus")}</span>
    </div>
  );
}
