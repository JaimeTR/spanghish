"use client";

import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { useFormAction } from "@/components/forms/useFormAction";
import { markAllRead } from "./actions";

export function MarkAllRead({ locale }: { locale: string }) {
  const t = useTranslations("notifications");
  const { formAction, pending, state } = useFormAction(markAllRead);
  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-4 font-semibold text-structure hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:opacity-60"
      >
        {t("markAll")}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
