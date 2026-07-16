"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PlanTranslation } from "@/engines/platform-admin/pricing-service";
import { EditableField } from "./editable-field";

interface PricingTier {
  name: string;
  desc: string;
  priceMonthly: string;
  priceAnnual: string;
  custom?: boolean;
  cta: string;
  recommended?: boolean;
  features: string[];
}

/** A DB-backed plan, as passed down from the server-rendered landing page. */
export interface DbPricingPlan {
  key: string;
  recommended: boolean;
  isCustom: boolean;
  translations: Record<string, PlanTranslation>;
}

function toTier(plan: DbPricingPlan, locale: string): PricingTier | null {
  const t = plan.translations[locale] ?? plan.translations.en;
  if (!t) return null;
  return {
    name: t.name,
    desc: t.desc,
    priceMonthly: t.priceMonthly,
    priceAnnual: t.priceAnnual,
    custom: plan.isCustom,
    cta: t.cta,
    recommended: plan.recommended,
    features: t.features,
  };
}

export function PricingSection({
  dbPlans,
  disclaimerValue,
  disclaimerHasOverride = false,
  editMode = false,
}: {
  dbPlans?: DbPricingPlan[];
  disclaimerValue?: string;
  disclaimerHasOverride?: boolean;
  editMode?: boolean;
}) {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();
  const staticTiers = t.raw("tiers") as PricingTier[];
  const priceNote = t("priceNote");
  const billedAnnually = t("billedAnnually");
  const [annual, setAnnual] = useState(true);

  const tiers = dbPlans && dbPlans.length > 0
    ? dbPlans.map((p) => toTier(p, locale)).filter((x): x is PricingTier => x !== null)
    : staticTiers;

  return (
    <section id="pricing" className="bg-[#f0f3f1] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-semibold tracking-[0.15em] text-[#2f7d72]">
          {t("eyebrow")}
        </p>
        <h2
          className="mx-auto mt-4 max-w-2xl text-center text-4xl font-bold leading-tight tracking-tight text-[#14211e] sm:text-5xl"
          style={{ fontFamily: "var(--landing-font-display)" }}
        >
          {t("headline")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm text-[#65716d]">
          <EditableField
            as="span"
            contentKey="pricing.disclaimer"
            value={disclaimerValue ?? t("disclaimer")}
            hasOverride={disclaimerHasOverride}
            editMode={editMode}
          />
        </p>

        <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-lg border border-[#dde4e0] bg-white p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={!annual ? "rounded-md bg-[#183f3b] px-4 py-1.5 text-sm font-semibold text-white" : "px-4 py-1.5 text-sm font-medium text-[#65716d]"}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={annual ? "flex items-center gap-1.5 rounded-md bg-[#183f3b] px-4 py-1.5 text-sm font-semibold text-white" : "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-[#65716d]"}
          >
            {t("annual")}
            <span className="rounded-full bg-[#aee1d3] px-1.5 py-0.5 text-[10px] font-bold text-[#14211e]">
              {t("save")}
            </span>
          </button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.recommended
                  ? "relative rounded-2xl border-2 border-[#2f7d72] bg-white p-6 shadow-lg"
                  : "rounded-2xl border border-[#dde4e0] bg-white p-6"
              }
            >
              {tier.recommended && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-[#2f7d72] px-3 py-1 text-[10px] font-bold text-white">
                  Recommended
                </span>
              )}
              <h3 className="font-semibold text-[#14211e]">{tier.name}</h3>
              <p className="mt-1 text-xs text-[#65716d]">{tier.desc}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-[#14211e]">
                  {annual ? tier.priceAnnual : tier.priceMonthly}
                </span>
                {!tier.custom && <span className="ms-1 text-xs text-[#8c9692]">{priceNote}</span>}
              </p>
              {annual && tier.priceAnnual !== tier.priceMonthly && (
                <p className="mt-0.5 text-xs text-[#8c9692]">{billedAnnually}</p>
              )}
              <Link
                href="/register"
                className={
                  tier.recommended
                    ? "mt-4 block rounded-md bg-[#183f3b] py-2 text-center text-sm font-semibold text-white hover:bg-[#132f2c]"
                    : "mt-4 block rounded-md border border-[#dde4e0] py-2 text-center text-sm font-semibold text-[#14211e] hover:bg-[#f0f3f1]"
                }
              >
                {tier.cta}
              </Link>
              <ul className="mt-5 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#65716d]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2f7d72]" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
