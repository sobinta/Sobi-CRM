import { getTranslations } from "next-intl/server";

export async function StepsSection() {
  const t = await getTranslations("landing.steps");
  const items = t.raw("items") as Array<{ title: string; desc: string }>;

  return (
    <section id="how-it-works" className="bg-[#f0f3f1] py-24">
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

        <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute inset-x-0 top-4 hidden h-px bg-[#dde4e0] lg:block" />
          {items.map((item, i) => (
            <div key={item.title} className="relative">
              <div className="relative z-10 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#183f3b] text-xs font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#14211e]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#65716d]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
