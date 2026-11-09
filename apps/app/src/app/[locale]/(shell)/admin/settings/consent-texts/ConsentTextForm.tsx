"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { CONSENT_KINDS } from "@/lib/schemas/people";
import { createConsentText, type ConsentTextField } from "./actions";

export function ConsentTextForm({ locale, today }: { locale: Locale; today: string }) {
  const t = useTranslations("consents.texts");
  const te = useTranslations("enums");
  const form = useFormAction<ConsentTextField>(createConsentText);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label={t("kind")} error={errors.kind}>
          <select defaultValue={form.value("kind", "minor_data")} className={inputClass}>
            {CONSENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {te(`consentKind.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field name="effectiveFrom" label={t("effectiveFrom")} error={errors.effectiveFrom}>
          <input type="date" required defaultValue={form.value("effectiveFrom", today)} className={inputClass} />
        </Field>
        <Field name="bodyEs" label={t("bodyEs")} error={errors.bodyEs}>
          <textarea lang="es" rows={8} required maxLength={20000} defaultValue={form.value("bodyEs")} className={inputClass} />
        </Field>
        <Field name="bodyEn" label={t("bodyEn")} error={errors.bodyEn}>
          <textarea lang="en" rows={8} required maxLength={20000} defaultValue={form.value("bodyEn")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("create")}</SubmitButton>
    </form>
  );
}
