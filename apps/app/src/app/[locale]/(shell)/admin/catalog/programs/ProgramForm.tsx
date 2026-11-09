"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { AUDIENCES, FORMATS } from "@/lib/schemas/catalog";
import { saveProgram, type ProgramField } from "./actions";

export type ProgramFormValues = {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  description_es: string | null;
  description_en: string | null;
  language_code: string;
  audience: string;
  format: string;
  level_id: string | null;
  duration_weeks: number | null;
  lesson_minutes: number;
  active: boolean;
  is_public: boolean;
};

export type Option = { value: string; label: string };

export function ProgramForm({
  locale,
  program,
  languages,
  levels,
}: {
  locale: Locale;
  program?: ProgramFormValues;
  languages: Option[];
  levels: Option[];
}) {
  const t = useTranslations("catalog.programs");
  const te = useTranslations("enums");
  const form = useFormAction<ProgramField>(saveProgram);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      {program ? <input type="hidden" name="id" value={program.id} /> : null}
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field name="code" label={t("code")} error={errors.code} hint={t("codeHint")}>
          <input
            type="text"
            required
            maxLength={40}
            pattern="[a-z0-9\-]{2,40}"
            autoComplete="off"
            defaultValue={form.value("code", program?.code)}
            className={inputClass}
          />
        </Field>
        <Field name="languageCode" label={t("language")} error={errors.languageCode}>
          <select defaultValue={form.value("languageCode", program?.language_code ?? "es")} className={inputClass}>
            {languages.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="nameEs" label={t("nameEs")} error={errors.nameEs}>
          <input type="text" lang="es" required maxLength={120} defaultValue={form.value("nameEs", program?.name_es)} className={inputClass} />
        </Field>
        <Field name="nameEn" label={t("nameEn")} error={errors.nameEn}>
          <input type="text" lang="en" required maxLength={120} defaultValue={form.value("nameEn", program?.name_en)} className={inputClass} />
        </Field>
        <Field name="audience" label={t("audience")} error={errors.audience}>
          <select defaultValue={form.value("audience", program?.audience ?? "adults")} className={inputClass}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {te(`audience.${a}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field name="format" label={t("format")} error={errors.format}>
          <select defaultValue={form.value("format", program?.format ?? "local_group")} className={inputClass}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {te(`format.${f}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field name="levelId" label={t("level")} error={errors.levelId}>
          <select defaultValue={form.value("levelId", program?.level_id ?? "")} className={inputClass}>
            <option value="">{t("noLevel")}</option>
            {levels.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="durationWeeks" label={t("durationWeeks")} error={errors.durationWeeks} hint={t("durationHint")}>
          <input type="number" inputMode="numeric" min={1} max={52} defaultValue={form.value("durationWeeks", program?.duration_weeks)} className={inputClass} />
        </Field>
        <Field name="lessonMinutes" label={t("lessonMinutes")} error={errors.lessonMinutes}>
          <input type="number" inputMode="numeric" required min={15} max={240} defaultValue={form.value("lessonMinutes", program?.lesson_minutes ?? 70)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
          <Field name="descriptionEs" label={t("descriptionEs")} error={errors.descriptionEs}>
            <textarea lang="es" rows={4} maxLength={2000} defaultValue={form.value("descriptionEs", program?.description_es)} className={inputClass} />
          </Field>
          <Field name="descriptionEn" label={t("descriptionEn")} error={errors.descriptionEn}>
            <textarea lang="en" rows={4} maxLength={2000} defaultValue={form.value("descriptionEn", program?.description_en)} className={inputClass} />
          </Field>
        </div>
        <Checkbox name="active" label={t("active")} defaultChecked={form.checked("active", program?.active ?? true)} />
        <Checkbox
          name="isPublic"
          label={t("isPublic")}
          hint={t("isPublicHint")}
          defaultChecked={form.checked("isPublic", program?.is_public ?? false)}
        />
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{program ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
