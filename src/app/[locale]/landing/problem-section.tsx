import { getTranslations } from "next-intl/server";

export async function ProblemSection() {
  const t = await getTranslations("landing.problem");
  const points = t.raw("points") as Array<{ title: string }>;

  return (
    <section className="bg-[#14211e] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-semibold tracking-[0.15em] text-[#8ad0b4]">
          {t("eyebrow")}
        </p>
        <h2
          className="mx-auto mt-4 max-w-2xl text-center text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
          style={{ fontFamily: "var(--landing-font-display)" }}
        >
          {t("headline1")} <span className="text-[#8ad0b4]">{t("headline2")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-white/60">
          {t("subhead")}
        </p>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-0">
            {points.map((p, i) => (
              <div key={p.title} className="flex items-start gap-4 border-b border-white/10 py-5 first:pt-0">
                <span className="text-sm font-semibold text-[#8ad0b4]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-lg text-white">{p.title}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <div className="border-s-2 border-[#183f3b] ps-4">
              <p className="text-xs font-semibold tracking-wide text-[#8c9692]">{t("flowRawLabel")}</p>
              <p className="mt-1 rounded-md bg-[#f0f3f1] px-3 py-2 text-sm text-[#65716d]">{t("flowRaw")}</p>
            </div>
            <div className="mt-5 border-s-2 border-[#2f7d72] ps-4">
              <p className="text-xs font-semibold tracking-wide text-[#8c9692]">{t("flowStructuredLabel")}</p>
              <p className="mt-1 text-base font-semibold text-[#14211e]">{t("flowStructured")}</p>
            </div>
            <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-[#e4f2ee] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2f7d72] text-white">✓</span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#183f3b]">{t("flowFollowupLabel")}</p>
                <p className="text-sm text-[#183f3b]">{t("flowFollowup")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
