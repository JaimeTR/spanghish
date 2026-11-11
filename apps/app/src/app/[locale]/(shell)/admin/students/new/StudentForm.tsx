"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { GuardianPicker, type GuardianOption } from "@/components/forms/GuardianPicker";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { AUDIENCES } from "@/lib/schemas/catalog";
import { CONSENT_METHODS, GENDERS, RELATIONSHIPS, type StudentField } from "@/lib/schemas/people";
import { createStudent } from "../actions";

type Option = { value: string; label: string };

export type ConsentTextView = { id: string; body: string; effectiveFrom: string };

const legendClass = "mb-3 text-base font-semibold text-text";
const fieldsetClass = "rounded-md border border-line bg-surface p-5";

/**
 * Alta de alumno. Los bloques de tutor y consentimiento (clase kid-only) solo
 * se ven con el segmento "niños" (CSS en globals.css, sin JS). El texto del
 * consentimiento vigente se muestra entero antes de la casilla.
 */
export function StudentForm({
  locale,
  levels,
  guardians,
  consentText,
}: {
  locale: Locale;
  levels: Option[];
  guardians: GuardianOption[];
  consentText: ConsentTextView | null;
}) {
  const t = useTranslations("students.form");
  const te = useTranslations("enums");
  const tl = useTranslations("locales");
  const form = useFormAction<StudentField>(createStudent);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="student-form mt-8 space-y-6">
      <input type="hidden" name="uiLocale" value={locale} />
      <div key={form.formKey} className="space-y-6">
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>{t("student")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label={t("fullName")} error={errors.fullName}>
              <input type="text" required maxLength={120} autoComplete="off" defaultValue={form.value("fullName")} className={inputClass} />
            </Field>
            <Field name="audience" label={t("audience")} error={errors.audience}>
              <select defaultValue={form.value("audience", "adults")} className={inputClass}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {te(`audience.${a}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="levelId" label={t("level")} error={errors.levelId}>
              <select defaultValue={form.value("levelId", "")} className={inputClass}>
                <option value="">{t("noLevel")}</option>
                {levels.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="preferredLocale" label={t("preferredLocale")} error={errors.preferredLocale}>
              <select defaultValue={form.value("preferredLocale", locale)} className={inputClass}>
                <option value="es">{tl("es")}</option>
                <option value="en">{tl("en")}</option>
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>{t("contact")}</legend>
          <p className="mb-4 text-sm text-text-muted">{t("contactHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="email" label={t("email")} error={errors.email}>
              <input type="email" maxLength={254} autoComplete="off" defaultValue={form.value("email")} className={inputClass} />
            </Field>
            <Field name="phone" label={t("phone")} error={errors.phone}>
              <input type="tel" maxLength={30} autoComplete="off" defaultValue={form.value("phone")} className={inputClass} />
            </Field>
            <Field name="gender" label={t("gender")} error={errors.gender}>
              <select defaultValue={form.value("gender", "")} className={inputClass}>
                <option value="">{t("noGender")}</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {te(`gender.${g}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="birthDate" label={t("birthDate")} error={errors.birthDate} hint={t("birthDateHint")}>
              <input type="date" min="1900-01-01" defaultValue={form.value("birthDate")} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <fieldset className={`kid-only ${fieldsetClass}`}>
          <legend className={legendClass}>{t("guardian")}</legend>
          <p className="mb-4 text-sm text-text-muted">{t("guardianHint")}</p>
          <GuardianPicker
            guardians={guardians}
            relationships={RELATIONSHIPS.map((r) => ({ value: r, label: te(`relationship.${r}`) }))}
            labels={{
              name: t("guardianFullName"),
              relationship: t("relationship"),
              email: t("guardianEmail"),
              phone: t("guardianPhone"),
              registered: t("guardianRegistered"),
              newOne: t("guardianNew"),
            }}
            values={{
              id: form.value("guardianId"),
              name: form.value("guardianFullName"),
              email: form.value("guardianEmail"),
              phone: form.value("guardianPhone"),
              relationship: form.value("guardianRelationship"),
            }}
            errors={errors}
          />
        </fieldset>

        <fieldset className={`kid-only ${fieldsetClass}`}>
          <legend className={legendClass}>{t("consent")}</legend>
          {consentText ? (
            <>
              <input type="hidden" name="consentTextId" value={consentText.id} />
              <p className="text-sm text-text-muted">
                {t("consentVersion", { id: consentText.id, date: consentText.effectiveFrom })}
              </p>
              <blockquote
                lang={locale}
                className="my-3 max-h-60 overflow-y-auto rounded-md border border-line bg-surface-sunken p-4 text-sm whitespace-pre-line text-text"
              >
                {consentText.body}
              </blockquote>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="consentMethod" label={t("consentMethod")} error={errors.consentMethod}>
                  <select defaultValue={form.value("consentMethod", "paper")} className={inputClass}>
                    {CONSENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {te(`consentMethod.${m}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="self-end">
                  <Checkbox
                    name="consentGranted"
                    label={t("consentGranted")}
                    defaultChecked={form.checked("consentGranted", false)}
                    errorText={errors.consentGranted ? t("consentGrantedRequired") : undefined}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-danger">{t("noConsentText")}</p>
          )}
        </fieldset>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("create")}</SubmitButton>
    </form>
  );
}
