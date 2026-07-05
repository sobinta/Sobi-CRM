import { getTranslations } from "next-intl/server";
import { Hammer } from "lucide-react";

/**
 * Temporary catch-all for not-yet-built workspace areas.
 * Routes are claimed by real pages phase by phase; this keeps
 * navigation honest instead of 404ing.
 */
export default async function ComingSoonPage() {
  const t = await getTranslations("common");

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-sunken text-ink-faint">
        <Hammer className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-ink-muted">{t("comingSoon")}</p>
    </div>
  );
}
