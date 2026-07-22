"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ contractId }: { contractId: string }) {
  const t = useTranslations("contracts");
  return (
    <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
      <Link
        href={`/crm/contracts/${contractId}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t("backToContract")}
      </Link>
      <Button variant="primary" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> {t("printSave")}
      </Button>
    </div>
  );
}
