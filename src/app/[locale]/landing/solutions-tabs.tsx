"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface SolutionTab {
  key: string;
  label: string;
  headline: string;
  body: string;
  quote: string;
  author: string;
}

export function SolutionsTabs() {
  const t = useTranslations("landing.solutions");
  const tabs = t.raw("tabs") as SolutionTab[];
  const [active, setActive] = useState(0);
  const current = tabs[active];

  return (
    <section id="solutions" className="bg-white py-24">
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

        <div className="mt-10 flex flex-wrap justify-center gap-1.5 border-b border-[#dde4e0] pb-4">
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(i)}
              className={
                i === active
                  ? "rounded-md bg-[#183f3b] px-3.5 py-2 text-sm font-semibold text-white"
                  : "rounded-md px-3.5 py-2 text-sm font-medium text-[#65716d] hover:bg-[#f0f3f1]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-8 rounded-2xl bg-[#f0f3f1] p-8 lg:grid-cols-2 lg:p-10">
          <div>
            <h3 className="text-2xl font-bold leading-tight text-[#14211e]">{current.headline}</h3>
            <p className="mt-3 text-base leading-relaxed text-[#65716d]">{current.body}</p>
          </div>
          <div className="rounded-xl bg-[#183f3b] p-6 text-white">
            <p className="text-lg leading-relaxed">&ldquo;{current.quote}&rdquo;</p>
            <p className="mt-4 text-sm text-white/60">— {current.author}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
