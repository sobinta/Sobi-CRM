"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CrmDashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("dashboard");
  useEffect(() => {
    console.error("CRM dashboard render failed", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-6 py-12">
      <div className="w-full rounded-xl border border-line bg-surface-raised p-6 text-center shadow-raised">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-danger-subtle text-danger-subtle-ink">
          <TriangleAlert aria-hidden="true" className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">{t("errorTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("errorBody")}</p>
        <Button variant="primary" className="mt-5" onClick={unstable_retry}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
