import { getLocale } from "next-intl/server";
import { LandingNav } from "./landing-nav";
import { Hero } from "./hero";
import { ProblemSection } from "./problem-section";
import { StepsSection } from "./steps-section";
import { AnalyticsSection } from "./analytics-section";
import { SolutionsTabs } from "./solutions-tabs";
import { PricingSection } from "./pricing-section";
import { FaqSection } from "./faq-section";
import { CtaBanner } from "./cta-banner";
import { LandingFooter } from "./landing-footer";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import { listPricingPlansPublic } from "@/engines/platform-admin/pricing-service";
import { getContentOverridesPublic, resolveContent } from "@/engines/platform-admin/content-service";

/** Public marketing page shown at "/" when there's no active session. */
export async function LandingPage() {
  const locale = await getLocale();
  const [assets, dbPlans, overrides] = await Promise.all([
    getSiteAssetsPublic(),
    listPricingPlansPublic(),
    getContentOverridesPublic(),
  ]);

  return (
    <div
      className="landing-root min-h-dvh bg-[#f5f7f5] text-[#14211e]"
      style={{ fontFamily: "var(--landing-font-body)" }}
    >
      <LandingNav logoSrc={assets.logo} />
      <Hero />
      <ProblemSection />
      <StepsSection />
      <AnalyticsSection />
      <SolutionsTabs />
      <PricingSection
        dbPlans={dbPlans.map((p) => ({
          key: p.key,
          recommended: p.recommended,
          isCustom: p.isCustom,
          translations: p.translations as never,
        }))}
        disclaimerOverride={
          overrides.has(`${locale}:pricing.disclaimer`)
            ? resolveContent(overrides, locale, "pricing.disclaimer", "")
            : undefined
        }
      />
      <FaqSection />
      <CtaBanner />
      <LandingFooter />
    </div>
  );
}
