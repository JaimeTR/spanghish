"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { inviteTeacher, type InviteField } from "../actions";

export function InviteTeacherForm({ locale }: { locale: Locale }) {
  const t = useTranslations("teachers.new");
  const tl = useTranslations("locales");
  const [state, action, values] = useFormAction<InviteField>(inviteTeacher);
  const errors = state.status === "invalid" ? state.fieldErrors : {};

  return (
    <form action={action} noValidate className="mt-8 max-w-xl space-y-5 rounded-md border border-line bg-surface p-5">
      <input type="hidden" name="uiLocale" value={locale} />
      <Field name="fullName" label={t("fullName")} error={errors.fullName}>
        <input
          type="text"
          autoComplete="off"
          required
          maxLength={120}
          defaultValue={values.fullName}
          className={inputClass}
        />
      </Field>
      <Field name="email" label={t("email")} error={errors.email} hint={t("emailHint")}>
        <input
          type="email"
          autoComplete="off"
          required
          maxLength={254}
          defaultValue={values.email}
          className={inputClass}
        />
      </Field>
      <Field name="locale" label={t("locale")} error={errors.locale}>
        <select key={values.locale ?? locale} defaultValue={values.locale ?? locale} className={inputClass}>
          <option value="es">{tl("es")}</option>
          <option value="en">{tl("en")}</option>
        </select>
      </Field>
      <FormStatus state={state} />
      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>
    </form>
  );
}
