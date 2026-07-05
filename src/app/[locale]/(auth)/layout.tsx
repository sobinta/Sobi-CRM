import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("app");

  return (
    <div className="flex min-h-dvh">
      {/* Brand panel — the product's thesis, quietly stated */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-rail p-12 lg:flex">
        <div className="flex items-center gap-2.5 text-ink-on-rail">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-ink-on-brand">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.55" />
              <rect x="7" y="7" width="9" height="9" rx="2" fill="currentColor" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {t("name")}
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink-on-rail">
            {t("tagline")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-on-rail/60">
            One platform, every module you need — CRM, operations, finance, and
            industry workflows that adapt to how your business actually works.
          </p>
        </div>

        {/* Ambient signature: faint module planes */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -end-24 h-72 w-72 rounded-3xl border border-white/5 bg-white/[0.02]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -end-8 h-72 w-72 rounded-3xl border border-white/5 bg-white/[0.02]"
        />
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
