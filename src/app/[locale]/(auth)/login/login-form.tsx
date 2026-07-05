"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "@/core/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Link } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

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

  return (
    <div>
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
    </div>
  );
}
