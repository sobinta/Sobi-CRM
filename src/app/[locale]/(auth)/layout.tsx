import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("auth");
  const tApp = await getTranslations("app");

  return (
    <div className="flex min-h-dvh">
      {/* Brand panel — pine/mint visual language shared with the landing page */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#183f3b] p-12 lg:flex">
        <Logo size={30} tone="on-dark" />
        <span className="sr-only">{tApp("name")}</span>

        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#aee1d3]" />
            {t("panelBadge")}
          </span>

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white">
            {t("panelHeadline1")}
            <br />
            <span className="text-[#8ad0b4]">{t("panelHeadline2")}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {t("panelSubhead")}
          </p>

          <ul className="mt-6 space-y-2.5">
            {["panelFeature1", "panelFeature2", "panelFeature3"].map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2f7d72]">
                  <Check className="h-3 w-3 text-white" />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>

        {/* Ambient signature: faint module planes */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -end-24 h-72 w-72 rounded-3xl border border-white/10 bg-white/[0.03]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -end-8 h-72 w-72 rounded-3xl border border-white/10 bg-white/[0.03]"
        />
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
