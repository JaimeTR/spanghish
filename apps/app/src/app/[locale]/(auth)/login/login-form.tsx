"use client";

import { Button } from "@spanglish/ui";
import { ArrowRight, CircleAlert, LoaderCircle, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { IconField, PasswordField } from "@/components/auth/fields";
import { authField, authLabel } from "@/components/auth/styles";
import { linkClass } from "@/components/form-styles";
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
  const invalid = error === "credentials";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className={authLabel}>
          {t("email")}
        </label>
        <IconField icon={<Mail className="size-[1.125rem]" strokeWidth={1.75} />}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            required
            placeholder={t("emailPlaceholder")}
            aria-invalid={invalid || undefined}
            aria-describedby={error ? "login-error" : undefined}
            className={`${authField} pr-3 pl-11`}
          />
        </IconField>
      </div>

      <PasswordField
        label={t("password")}
        showLabel={t("show")}
        hideLabel={t("hide")}
        capsLockLabel={t("capsLock")}
        invalid={invalid}
        describedBy={error ? "login-error" : undefined}
        footer={
          <a href={`/${locale}/forgot-password`} className={`shrink-0 text-sm ${linkClass}`}>
            {t("forgot")}
          </a>
        }
      />

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="remember" value="1" defaultChecked className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-purple" />
        <span className="text-sm font-semibold text-ink">
          {t("remember")}
          <span className="block font-normal text-text-muted">{t("rememberHint")}</span>
        </span>
      </label>

      <div
        id="login-error"
        role="alert"
        className={
          error
            ? "flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm font-semibold text-danger"
            : undefined
        }
      >
        {error ? (
          <>
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
            <span>{t(`errors.${error}`)}</span>
          </>
        ) : null}
      </div>

      <Button type="submit" className="w-full min-h-12! text-base" disabled={pending} aria-disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" strokeWidth={2.25} />
            {t("submitting")}
          </>
        ) : (
          <>
            {t("submit")}
            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </>
        )}
      </Button>
    </form>
  );
}
