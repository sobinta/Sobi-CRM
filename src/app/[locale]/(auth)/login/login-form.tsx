"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "@/core/auth/client";
import { DEMO_LOGIN_ENABLED, signInDemoAndRedirect } from "@/core/auth/demo-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Logo } from "@/components/brand/logo";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";

export function LoginForm({ logoSrc }: { logoSrc?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  function switchLocale(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (res.error) {
      setPending(false);
      setError(
        res.error.status === 401 ? t("invalidCredentials") : t("genericError"),
      );
      return;
    }
    window.location.assign(`/${locale}/crm`);
  }

  async function onDemoLogin() {
    setError(undefined);
    setDemoPending(true);
    const res = await signInDemoAndRedirect(locale);
    if (!res.ok) {
      setDemoPending(false);
      setError(t("genericError"));
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <Logo size={78} src={logoSrc} />
        <select
          aria-label="Language"
          value={locale}
          onChange={(e) => switchLocale(e.target.value as AppLocale)}
          className="rounded-md border border-line bg-surface-raised px-2 py-1 text-xs text-ink"
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {localeMeta[l].label}
            </option>
          ))}
        </select>
      </div>

      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("signInTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t("signInSubtitle")}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="email" required>
            {t("email")}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="password" required>
            {t("password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
          />
        </div>

        <FieldError>{error}</FieldError>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      {DEMO_LOGIN_ENABLED && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint">{t("orDivider")}</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onDemoLogin}
            disabled={demoPending || pending}
          >
            {demoPending ? t("signingInDemo") : t("demoLogin")}
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          locale={locale}
          className="font-medium text-brand hover:text-brand-hover"
        >
          {t("createOne")}
        </Link>
      </p>

      <p className="mt-4 text-center text-sm">
        <Link href="/" locale={locale} className="text-ink-muted hover:text-ink">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
