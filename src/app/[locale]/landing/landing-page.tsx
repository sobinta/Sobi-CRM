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
import { LandingMobileMenuProvider } from "./landing-mobile-menu-context";
import { LandingMobileTabBar } from "./landing-mobile-tab-bar";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import { listPricingPlansPublic } from "@/engines/platform-admin/pricing-service";
import { getContentOverridesPublic } from "@/engines/platform-admin/content-service";
import {
  getAnnouncementBarPublic,
  resolveAnnouncementText,
} from "@/engines/platform-admin/announcement-service";

/**
 * Public marketing page shown at "/" when there's no active session — or, for
 * a super admin, the live site itself with `editMode` enabling hover-to-edit
 * on the content pulled from the platform-admin overrides.
 */
export async function LandingPage({
  editMode = false,
  demoEnabled = false,
}: {
  editMode?: boolean;
  demoEnabled?: boolean;
}) {
  const locale = await getLocale();
  const [assets, dbPlans, overrides, announcementRow] = await Promise.all([
    getSiteAssetsPublic(),
    listPricingPlansPublic(),
    getContentOverridesPublic(),
    getAnnouncementBarPublic(),
  ]);

  return (
    <LandingMobileMenuProvider>
      <div
        className="landing-root min-h-dvh bg-[#f5f7f5] pb-14 text-[#14211e] lg:pb-0"
        style={{ fontFamily: "var(--landing-font-body)" }}
      >
        {announcementRow?.enabled && (
          <AnnouncementBar
            text={resolveAnnouncementText(announcementRow.translations, locale)}
            backgroundColor={announcementRow.backgroundColor}
            textColor={announcementRow.textColor}
            animation={announcementRow.animation as "ltr" | "rtl" | "static"}
            linkUrl={announcementRow.linkUrl}
          />
        )}
        <LandingNav logoSrc={assets.logo} demoEnabled={demoEnabled} />
        <Hero editMode={editMode} demoEnabled={demoEnabled} />
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
          disclaimerValue={overrides.get(`${locale}:pricing.disclaimer`)}
          disclaimerHasOverride={overrides.has(`${locale}:pricing.disclaimer`)}
          editMode={editMode}
        />
        <FaqSection />
        <CtaBanner editMode={editMode} demoEnabled={demoEnabled} />
        <LandingFooter />
        <LandingMobileTabBar demoEnabled={demoEnabled} />
      </div>
    </LandingMobileMenuProvider>
  );
}
