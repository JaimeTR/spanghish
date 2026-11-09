"use client";

import { Button } from "@spanglish/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { inputClass, labelClass, linkClass } from "@/components/form-styles";
import { updatePassword, type ResetState } from "@/lib/auth-actions";

export function ResetForm({ locale, tokenHash }: { locale: string; tokenHash: string }) {
  const t = useTranslations("reset");
  const [state, formAction, pending] = useActionState<ResetState, FormData>(updatePassword, {
    status: "idle",
  });
  const error = state.status === "idle" ? null : state.status;
  const passwordInvalid = error === "invalid";
  const confirmInvalid = error === "mismatch";
  const linkSpent = error === "expired" || error === "unavailable";

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tokenHash" value={tokenHash} />
      <div>
        <label htmlFor="password" className={labelClass}>
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          aria-invalid={passwordInvalid || undefined}
          aria-describedby={passwordInvalid ? "password-hint reset-error" : "password-hint"}
          className={inputClass}
        />
        <p id="password-hint" className="mt-1 text-sm text-text-muted">
          {t("passwordHint")}
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className={labelClass}>
          {t("confirm")}
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          aria-invalid={confirmInvalid || undefined}
          aria-describedby={confirmInvalid ? "reset-error" : undefined}
          className={inputClass}
        />
      </div>
      <div id="reset-error" role="alert" className="min-h-6 text-sm font-semibold text-danger">
        {error ? t(`errors.${error}`) : null}
      </div>
      {linkSpent ? (
        <p className="text-sm">
          <a href={`/${locale}/forgot-password`} className={linkClass}>
            {t("requestNew")}
          </a>
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-sm">
        <a href={`/${locale}/login`} className={linkClass}>
          {t("back")}
        </a>
      </p>
    </form>
  );
}
