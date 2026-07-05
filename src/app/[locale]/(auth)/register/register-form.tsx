"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUp } from "@/core/auth/client";
import { createWorkspaceAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const workspaceName = String(form.get("workspace"));

    const res = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (res.error) {
      setPending(false);
      setError(
        res.error.status === 422 ? t("emailInUse") : t("genericError"),
      );
      return;
    }

    // Session is now established (autoSignIn) — provision the workspace.
    const provisioned = await createWorkspaceAction({
      workspaceName,
      locale,
    });
    if (!provisioned.ok) {
      setPending(false);
      setError(t("genericError"));
      return;
    }

    // Full-document navigation so the freshly set session cookie is applied
    // to the server render of the app shell.
    window.location.assign(`/${locale}/crm`);
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("signUpTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t("signUpSubtitle")}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="name" required>
            {t("name")}
          </Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="workspace" required>
            {t("workspace")}
          </Label>
          <Input id="workspace" name="workspace" required />
          <p className="mt-1 text-xs text-ink-faint">{t("workspaceHint")}</p>
        </div>
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
            autoComplete="new-password"
            minLength={10}
            required
            dir="ltr"
          />
          <p className="mt-1 text-xs text-ink-faint">{t("passwordHint")}</p>
        </div>

        <FieldError>{error}</FieldError>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? t("creating") : t("signUp")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          locale={locale}
          className="font-medium text-brand hover:text-brand-hover"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
