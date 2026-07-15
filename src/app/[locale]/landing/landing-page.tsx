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

/** Public marketing page shown at "/" when there's no active session. */
export function LandingPage() {
  return (
    <div
      className="landing-root min-h-dvh bg-[#f5f7f5] text-[#14211e]"
      style={{ fontFamily: "var(--landing-font-body)" }}
    >
      <LandingNav />
      <Hero />
      <ProblemSection />
      <StepsSection />
      <AnalyticsSection />
      <SolutionsTabs />
      <PricingSection />
      <FaqSection />
      <CtaBanner />
      <LandingFooter />
    </div>
  );
}
