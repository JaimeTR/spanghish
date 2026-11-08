"use client";

import { Button } from "@spanglish/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { inputClass, labelClass, linkClass } from "@/components/form-styles";
import { login, type LoginError, type LoginState } from "@/lib/auth-actions";

export function LoginForm({
  locale,
  next,
  initialError,
}: {
  locale: string;
  next: string;
  initialError?: LoginError;
}) {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {
    error: initialError,
  });
  const error = state.error;

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className={labelClass}>
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={error === "credentials" || undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error === "credentials" || undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>
      <div id="login-error" role="alert" className="min-h-6 text-sm font-semibold text-danger">
        {error ? t(`errors.${error}`) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-sm">
        <a href={`/${locale}/forgot-password`} className={linkClass}>
          {t("forgot")}
        </a>
      </p>
    </form>
  );
}
