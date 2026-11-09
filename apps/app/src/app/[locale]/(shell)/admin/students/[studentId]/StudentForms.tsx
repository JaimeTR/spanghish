"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { CONSENT_METHODS, STUDENT_STATUSES } from "@/lib/schemas/people";
import {
  grantPortalAccess,
  recordConsent,
  updateStudent,
  type ConsentField,
  type PortalField,
  type UpdateStudentField,
} from "../actions";

type Option = { value: string; label: string };

const legendClass = "mb-3 text-base font-semibold text-text";

export type StudentEditValues = {
  id: string;
  full_name: string;
  level_id: string | null;
  preferred_locale: string;
  status: string;
  email: string | null;
  phone: string | null;
  birth_year: number | null;
  admin_notes: string | null;
};

/** Datos de la ficha y, aparte, el contacto que solo ve la administración. */
export function StudentEditForm({
  locale,
  student,
  levels,
}: {
  locale: Locale;
  student: StudentEditValues;
  levels: Option[];
}) {
  const t = useTranslations("students.form");
  const te = useTranslations("enums");
  const tl = useTranslations("locales");
  const form = useFormAction<UpdateStudentField>(updateStudent);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-6">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={student.id} />
      <div key={form.formKey} className="space-y-6">
        <fieldset>
          <legend className={legendClass}>{t("student")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label={t("fullName")} error={errors.fullName}>
              <input type="text" required maxLength={120} defaultValue={form.value("fullName", student.full_name)} className={inputClass} />
            </Field>
            <Field name="status" label={t("status")} error={errors.status}>
              <select defaultValue={form.value("status", student.status)} className={inputClass}>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {te(`studentStatus.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="levelId" label={t("level")} error={errors.levelId}>
              <select defaultValue={form.value("levelId", student.level_id ?? "")} className={inputClass}>
                <option value="">{t("noLevel")}</option>
                {levels.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="preferredLocale" label={t("preferredLocale")} error={errors.preferredLocale}>
              <select defaultValue={form.value("preferredLocale", student.preferred_locale)} className={inputClass}>
                <option value="es">{tl("es")}</option>
                <option value="en">{tl("en")}</option>
              </select>
            </Field>
          </div>
        </fieldset>
        <fieldset>
          <legend className={legendClass}>{t("contact")}</legend>
          <p className="mb-4 text-sm text-text-muted">{t("contactHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="email" label={t("email")} error={errors.email}>
              <input type="email" maxLength={254} defaultValue={form.value("email", student.email)} className={inputClass} />
            </Field>
            <Field name="phone" label={t("phone")} error={errors.phone}>
              <input type="tel" maxLength={30} defaultValue={form.value("phone", student.phone)} className={inputClass} />
            </Field>
            <Field name="birthYear" label={t("birthYear")} error={errors.birthYear}>
              <input type="number" inputMode="numeric" min={1900} max={2100} defaultValue={form.value("birthYear", student.birth_year)} className={inputClass} />
            </Field>
            <Field name="adminNotes" label={t("adminNotes")} error={errors.adminNotes} hint={t("adminNotesHint")}>
              <textarea rows={3} maxLength={2000} defaultValue={form.value("adminNotes", student.admin_notes)} className={inputClass} />
            </Field>
          </div>
        </fieldset>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}

/** Nuevo registro de consentimiento (concedido o revocado); el historial no se edita. */
export function ConsentForm({
  locale,
  studentId,
  texts,
  guardians,
  isMinor,
}: {
  locale: Locale;
  studentId: string;
  texts: Option[];
  guardians: Option[];
  isMinor: boolean;
}) {
  const t = useTranslations("consents");
  const te = useTranslations("enums");
  const form = useFormAction<ConsentField>(recordConsent);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field name="textId" label={t("text")} error={errors.textId}>
          <select defaultValue={form.value("textId", texts[0]?.value ?? "")} className={inputClass}>
            {texts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="granted" label={t("decision")} error={errors.granted}>
          <select defaultValue={form.value("granted", "true")} className={inputClass}>
            <option value="true">{t("granted")}</option>
            <option value="false">{t("revoked")}</option>
          </select>
        </Field>
        <Field name="method" label={t("method")} error={errors.method}>
          <select defaultValue={form.value("method", "paper")} className={inputClass}>
            {CONSENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {te(`consentMethod.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        {isMinor ? (
          <Field name="guardianId" label={t("guardian")} error={errors.guardianId}>
            <select defaultValue={form.value("guardianId", guardians[0]?.value ?? "")} className={inputClass}>
              {guardians.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("record")}</SubmitButton>
    </form>
  );
}

/** Crea la cuenta de portal del alumno adulto y la enlaza a su ficha. */
export function PortalAccessForm({ locale, studentId }: { locale: Locale; studentId: string }) {
  const t = useTranslations("students.portal");
  const form = useFormAction<PortalField>(grantPortalAccess);
  return (
    <form action={form.formAction} className="space-y-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <FormStatus state={form.state} />
      {form.state.status === "invalid" && form.state.fieldErrors.email ? (
        <p className="text-sm font-semibold text-danger">{t("needsEmail")}</p>
      ) : null}
      <SubmitButton variant="secondary" pendingLabel={t("granting")}>
        {t("grant")}
      </SubmitButton>
    </form>
  );
}
