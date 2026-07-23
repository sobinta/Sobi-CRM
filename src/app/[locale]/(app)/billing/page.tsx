import { notFound } from "next/navigation";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { getTenantPlanSummary } from "@/core/billing/subscription-summary";
import { listPricingPlansPublic, type PlanTranslation } from "@/engines/platform-admin/pricing-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlanView {
  key: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  recommended: boolean;
}

interface FallbackTier {
  name: string;
  desc: string;
  priceMonthly: string;
  features: string[];
  recommended?: boolean;
}

function localizedPlan(
  plan: {
    key: string;
    recommended: boolean;
    translations: unknown;
  },
  locale: string,
): PlanView | null {
  if (!plan.translations || typeof plan.translations !== "object" || Array.isArray(plan.translations)) return null;
  const map = plan.translations as Record<string, PlanTranslation | undefined>;
  const content = map[locale] ?? map.en;
  if (!content?.name) return null;
  return {
    key: plan.key,
    name: content.name,
    description: content.desc,
    price: content.priceMonthly,
    features: Array.isArray(content.features) ? content.features : [],
    recommended: plan.recommended,
  };
}

export default async function BillingPage() {
  const locale = await getLocale();
  const [t, tPricing, current, rows] = await Promise.all([
    getTranslations("account"),
    getTranslations("landing.pricing"),
    withPlatformContext(() => getTenantPlanSummary(locale)),
    listPricingPlansPublic(),
  ]);
  if (!current) notFound();

  const localizedRows = rows
    .filter((row) => row.active && row.key !== "demo")
    .map((row) => localizedPlan(row, locale))
    .filter((row): row is PlanView => Boolean(row));
  const fallbackKeys = ["free", "pro", "team", "enterprise"];
  const fallbackPlans = (tPricing.raw("tiers") as FallbackTier[]).map((tier, index) => ({
    key: fallbackKeys[index] ?? `plan-${index + 1}`,
    name: tier.name,
    description: tier.desc,
    price: tier.priceMonthly,
    features: tier.features,
    recommended: Boolean(tier.recommended),
  }));
  const plans = localizedRows.length > 0 ? localizedRows : fallbackPlans;

  return (
    <div className="pb-10">
      <PageHeader title={t("billingTitle")} description={t("billingDescription")} helpTopic="billing" />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-ink-on-brand">
              <CreditCard aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-brand-subtle-ink/70">{t("currentPlanLabel")}</p>
              <p className="mt-0.5 text-lg font-semibold text-brand-subtle-ink">{current.name}</p>
            </div>
          </div>
          <code className="w-fit rounded-md bg-surface-raised/70 px-2 py-1 text-xs text-brand-subtle-ink" dir="ltr">{current.key}</code>
        </section>

        <h2 className="mb-3 text-sm font-semibold text-ink">{t("availablePlans")}</h2>
        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">{t("noPlans")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const selected = plan.key === current.key;
              return (
                <Card key={plan.key} className={cn("relative flex min-h-[300px] flex-col p-5", plan.recommended && "border-brand-300")}>
                  {plan.recommended && (
                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-subtle px-2 py-1 text-[10px] font-semibold text-brand-subtle-ink">
                      <Sparkles aria-hidden="true" className="h-3 w-3" /> {t("recommended")}
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-ink-muted">{plan.description}</p>
                  <p className="mt-4 text-2xl font-semibold text-ink tabular-nums" dir="auto">{plan.price}</p>
                  <p className="text-[10px] text-ink-faint">{t("monthly")}</p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
                        <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {selected && (
                    <span className="mt-auto pt-5 text-xs font-semibold text-brand">{t("current")}</span>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <p id="upgrade-support" className="mt-5 rounded-lg border border-line bg-surface-raised px-4 py-3 text-sm leading-6 text-ink-muted">
          {t("upgradeHelp")}
        </p>
      </div>
    </div>
  );
}
