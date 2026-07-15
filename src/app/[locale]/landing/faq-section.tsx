"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqSection() {
  const t = useTranslations("landing.faq");
  const items = t.raw("items") as FaqItem[];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-[#2f7d72]">{t("eyebrow")}</p>
          <h2
            className="mt-4 text-4xl font-bold leading-tight tracking-tight text-[#14211e]"
            style={{ fontFamily: "var(--landing-font-display)" }}
          >
            {t("headline")}
          </h2>
        </div>

        <div>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-[#dde4e0]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-start"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-[#14211e]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#65716d] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-4 text-sm leading-relaxed text-[#65716d]">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
