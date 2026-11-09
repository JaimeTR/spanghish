"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { EDITION_STATUSES } from "@/lib/schemas/catalog";
import { saveEdition, type EditionField } from "../actions";

export type EditionFormValues = {
  id: string;
  label_es: string | null;
  label_en: string | null;
  starts_on: string;
  ends_on: string;
  status: string;
};

export function EditionForm({
  locale,
  programId,
  edition,
}: {
  locale: Locale;
  programId: string;
  edition?: EditionFormValues;
}) {
  const t = useTranslations("catalog.editions");
  const te = useTranslations("enums");
  const form = useFormAction<EditionField>(saveEdition);
  const errors = form.fieldErrors;
  const p = edition ? `ed-${edition.id}-` : "ed-new-";

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      {edition ? <input type="hidden" name="id" value={edition.id} /> : null}
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field idPrefix={p} name="labelEs" label={t("labelEs")} error={errors.labelEs}>
          <input type="text" lang="es" maxLength={120} defaultValue={form.value("labelEs", edition?.label_es)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="labelEn" label={t("labelEn")} error={errors.labelEn}>
          <input type="text" lang="en" maxLength={120} defaultValue={form.value("labelEn", edition?.label_en)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="startsOn" label={t("startsOn")} error={errors.startsOn}>
          <input type="date" required defaultValue={form.value("startsOn", edition?.starts_on)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="endsOn" label={t("endsOn")} error={errors.endsOn}>
          <input type="date" required defaultValue={form.value("endsOn", edition?.ends_on)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="status" label={t("status")} error={errors.status}>
          <select defaultValue={form.value("status", edition?.status ?? "draft")} className={inputClass}>
            {EDITION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {te(`editionStatus.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{edition ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
