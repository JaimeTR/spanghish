"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { saveProfile, type ProfileField } from "./actions";

export type ProfileValues = {
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  preferred_locale: string;
};

/** Formulario de "Mis datos": el mismo para administración, docentes, alumnos y tutores. */
export function ProfileForm({ locale, profile, userId }: { locale: Locale; profile: ProfileValues; userId?: string }) {
  const t = useTranslations("account.form");
  const tl = useTranslations("locales");
  const form = useFormAction<ProfileField>(saveProfile, { status: "idle" }, true);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field name="fullName" label={t("fullName")} error={errors.fullName} hint={t("fullNameHint")}>
            <input type="text" required maxLength={200} autoComplete="name" defaultValue={form.value("fullName", profile.full_name)} className={inputClass} />
          </Field>
        </div>
        <Field name="phone" label={t("phone")} error={errors.phone} hint={t("phoneHint")}>
          <input type="tel" inputMode="tel" maxLength={30} autoComplete="tel" defaultValue={form.value("phone", profile.phone)} className={inputClass} />
        </Field>
        <Field name="birthDate" label={t("birthDate")} error={errors.birthDate}>
          <input type="date" min="1900-01-01" autoComplete="bday" defaultValue={form.value("birthDate", profile.birth_date)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field name="address" label={t("address")} error={errors.address}>
            <input type="text" maxLength={300} autoComplete="street-address" defaultValue={form.value("address", profile.address)} className={inputClass} />
          </Field>
        </div>
        <Field name="city" label={t("city")} error={errors.city}>
          <input type="text" maxLength={100} autoComplete="address-level2" defaultValue={form.value("city", profile.city)} className={inputClass} />
        </Field>
        <Field name="country" label={t("country")} error={errors.country}>
          <input type="text" maxLength={100} autoComplete="country-name" defaultValue={form.value("country", profile.country)} className={inputClass} />
        </Field>
        <Field name="preferredLocale" label={t("preferredLocale")} error={errors.preferredLocale} hint={t("preferredLocaleHint")}>
          <select defaultValue={form.value("preferredLocale", profile.preferred_locale)} className={inputClass}>
            <option value="es">{tl("es")}</option>
            <option value="en">{tl("en")}</option>
          </select>
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
