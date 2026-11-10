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
  const form = useFormAction<InviteField>(inviteTeacher);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      <div key={form.formKey} className="space-y-5">
        <Field name="fullName" label={t("fullName")} error={errors.fullName}>
          <input
            type="text"
            autoComplete="off"
            required
            maxLength={120}
            defaultValue={form.value("fullName")}
            className={inputClass}
          />
        </Field>
        <Field
          name="email"
          label={t("email")}
          error={errors.email}
          hint={t("emailHint")}
        >
          <input
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            defaultValue={form.value("email")}
            className={inputClass}
          />
        </Field>
        <Field name="locale" label={t("locale")} error={errors.locale}>
          <select
            defaultValue={form.value("locale", locale)}
            className={inputClass}
          >
            <option value="es">{tl("es")}</option>
            <option value="en">{tl("en")}</option>
          </select>
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>
    </form>
  );
}
