import { getTranslations } from "next-intl/server";

export async function AnalyticsSection() {
  const t = await getTranslations("landing.analytics");

  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-[#2f7d72]">{t("eyebrow")}</p>
          <h2
            className="mt-4 text-4xl font-bold leading-tight tracking-tight text-[#14211e]"
            style={{ fontFamily: "var(--landing-font-display)" }}
          >
            {t("headline")}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#65716d]">{t("body")}</p>
          <a
            href="#pricing"
            className="mt-6 inline-block rounded-md bg-[#183f3b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132f2c]"
          >
            {t("cta")} →
          </a>
        </div>

        <AnalyticsMockup />
      </div>
    </section>
  );
}

function AnalyticsMockup() {
  const funnel = [
    { label: "Leads", value: 100 },
    { label: "Converted", value: 64 },
    { label: "Deal", value: 41 },
    { label: "Won", value: 22 },
  ];
  return (
    <div className="rounded-2xl border border-[#dde4e0] bg-[#fafcfb] p-6 shadow-[0_12px_36px_rgba(25,48,42,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#14211e]">Conversion funnel</p>
        <span className="rounded bg-[#e4f2ee] px-2 py-0.5 text-xs font-medium text-[#183f3b]">Last 30 days</span>
      </div>
      <div className="mt-5 space-y-3">
        {funnel.map((f) => (
          <div key={f.label}>
            <div className="mb-1 flex justify-between text-xs text-[#65716d]">
              <span>{f.label}</span>
              <span className="font-semibold text-[#14211e]">{f.value}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#e7ece9]">
              <div
                className="h-2.5 rounded-full bg-[#2f7d72]"
                style={{ width: `${f.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#dde4e0] pt-4">
        <div>
          <p className="text-xs text-[#8c9692]">Open deals</p>
          <p className="text-lg font-bold text-[#14211e]">18</p>
        </div>
        <div>
          <p className="text-xs text-[#8c9692]">Won revenue</p>
          <p className="text-lg font-bold text-[#14211e]">€52k</p>
        </div>
        <div>
          <p className="text-xs text-[#8c9692]">Contracts sent</p>
          <p className="text-lg font-bold text-[#14211e]">7</p>
        </div>
      </div>
    </div>
  );
}
