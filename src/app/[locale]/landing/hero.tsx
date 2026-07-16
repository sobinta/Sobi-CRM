import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { DEMO_LOGIN_ENABLED } from "@/core/auth/demo-login";
import { DemoCtaButton } from "./demo-cta-button";

export async function Hero() {
  const t = await getTranslations("landing.hero");
  const tAuth = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#183f3b] px-4 py-1.5 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#aee1d3]" />
            {t("badge")}
          </span>

          <h1
            className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-[#14211e] sm:text-6xl"
            style={{ fontFamily: "var(--landing-font-display)" }}
          >
            {t("headline1")}
            <br />
            <span className="text-[#2f7d72]">{t("headline2")}</span>
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#65716d]">
            {t("subhead")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-md bg-[#183f3b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132f2c]"
            >
              {t("ctaPrimary")}
            </Link>
            {DEMO_LOGIN_ENABLED ? (
              <DemoCtaButton
                pendingLabel={tAuth("signingInDemo")}
                className="rounded-md border border-[#dde4e0] bg-white px-5 py-3 text-sm font-semibold text-[#14211e] hover:bg-[#f0f3f1] disabled:opacity-60"
              >
                {t("ctaSecondary")}
              </DemoCtaButton>
            ) : (
              <a
                href="#how-it-works"
                className="rounded-md border border-[#dde4e0] bg-white px-5 py-3 text-sm font-semibold text-[#14211e] hover:bg-[#f0f3f1]"
              >
                {t("ctaSecondary")}
              </a>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#65716d]">
            {["check1", "check2", "check3"].map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#2f7d72]" /> {t(k)}
              </span>
            ))}
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

/** A live-rendered mini product mockup (not a screenshot) — a leads table card. */
function HeroMockup() {
  const rows = [
    { title: "Nordic Freight Partners", stage: "New", score: 74, tone: "#bd7d25" },
    { title: "Riverside Consulting", stage: "Converted", score: 82, tone: "#2f7d72" },
    { title: "Meadow Market Retail", stage: "New", score: 61, tone: "#bd7d25" },
  ];
  return (
    <div className="rounded-2xl border border-[#dde4e0] bg-white p-1 shadow-[0_12px_36px_rgba(25,48,42,0.08)]">
      <div className="flex items-center gap-1.5 border-b border-[#dde4e0] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#dde4e0]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#dde4e0]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#dde4e0]" />
        <span className="ms-2 text-xs font-medium text-[#8c9692]">Leads · SOBI CRM</span>
      </div>
      <div className="space-y-1 p-4">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-[#f0f3f1]">
            <div>
              <p className="text-sm font-medium text-[#14211e]">{r.title}</p>
              <p className="text-xs text-[#8c9692]">{r.stage}</p>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: r.tone }}
            >
              {r.score}
            </span>
          </div>
        ))}
        <div className="mt-2 rounded-lg bg-[#e4f2ee] px-3 py-2.5 text-xs text-[#183f3b]">
          <strong className="font-semibold">AI suggestion:</strong> Riverside Consulting is ready for a contract — support-retainer terms match their last message.
        </div>
      </div>
    </div>
  );
}
