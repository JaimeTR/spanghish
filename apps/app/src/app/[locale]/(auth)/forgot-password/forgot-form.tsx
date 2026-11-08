"use client";

import { Button } from "@spanglish/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { inputClass, labelClass, linkClass } from "@/components/form-styles";
import { requestPasswordReset, type ForgotState } from "@/lib/auth-actions";

export function ForgotForm({ locale }: { locale: string }) {
  const t = useTranslations("forgot");
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    { status: "idle" },
  );
  const invalid = state.status === "invalid";

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="locale" value={locale} />
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
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "forgot-error" : "forgot-status"}
          className={inputClass}
        />
      </div>
      <div id="forgot-error" role="alert" className="text-sm font-semibold text-danger">
        {invalid ? t("invalid") : null}
      </div>
      <p id="forgot-status" role="status" className="text-sm text-text">
        {state.status === "sent" ? t("sent") : null}
      </p>
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
