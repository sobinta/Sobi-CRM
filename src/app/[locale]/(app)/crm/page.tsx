import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { resolveSession } from "@/core/auth/session";

export default async function CrmDashboardPage() {
  const t = await getTranslations("dashboard");
  const session = await resolveSession();
  const firstName = session?.name.split(/\s+/)[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t("welcome", { name: firstName })}
        </h1>
      </header>

      {/* KPI placeholder cards — replaced by the Dashboard Builder in Phase 8 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-line bg-surface-raised p-4 shadow-raised"
          >
            <div className="mb-3 h-3.5 w-20 animate-pulse rounded bg-surface-sunken" />
            <div className="h-7 w-16 animate-pulse rounded bg-surface-sunken" />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface-raised/50 px-8 py-16 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand-subtle-ink">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="mb-1 text-base font-semibold text-ink">
          {t("placeholderTitle")}
        </h2>
        <p className="max-w-md text-sm text-ink-muted">
          {t("placeholderBody")}
        </p>
      </div>
    </div>
  );
}
