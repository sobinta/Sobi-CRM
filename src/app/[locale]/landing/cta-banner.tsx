import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { DEMO_LOGIN_ENABLED } from "@/core/auth/demo-login";
import { getContentOverridesPublic } from "@/engines/platform-admin/content-service";
import type { EditableContentKey } from "@/engines/platform-admin/content-keys";
import { EditableField } from "./editable-field";
import { DemoCtaButton } from "./demo-cta-button";

export async function CtaBanner({ editMode = false }: { editMode?: boolean }) {
  const t = await getTranslations("landing.cta");
  const tAuth = await getTranslations("auth");
  const locale = await getLocale();
  const overrides = await getContentOverridesPublic();
  const c = (key: EditableContentKey, fallback: string) => (
    <EditableField
      contentKey={key}
      value={overrides.get(`${locale}:${key}`) ?? fallback}
      hasOverride={overrides.has(`${locale}:${key}`)}
      editMode={editMode}
    />
  );

  return (
    <section className="bg-[#183f3b] py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-[#aee1d3]" />
        <h2
          className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl"
          style={{ fontFamily: "var(--landing-font-display)" }}
        >
          {c("cta.headline1", t("headline1"))}
          <br />
          {c("cta.headline2", t("headline2"))}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          {c("cta.subhead", t("subhead"))}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {DEMO_LOGIN_ENABLED && (
            <DemoCtaButton
              pendingLabel={tAuth("signingInDemo")}
              className="flex items-center gap-2 rounded-md bg-[#aee1d3] px-5 py-3 text-sm font-semibold text-[#14211e] hover:bg-[#98d4c4] disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {t("primary")} <ArrowRight className="h-4 w-4" />
              </span>
            </DemoCtaButton>
          )}
          <Link
            href="/register"
            className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white underline-offset-4 hover:bg-white/5 hover:underline"
          >
            {t("secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
