"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { saveLead, type LeadField } from "./actions";

/** Cambiar el estado de una solicitud y apuntar notas internas. */
export function LeadForm({ locale, id, status, notes }: { locale: string; id: string; status: string; notes: string | null }) {
  const t = useTranslations("leads");
  const form = useFormAction<LeadField>(saveLead, { status: "idle" }, true);
  const errors = form.fieldErrors;
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <div key={form.formKey} className="space-y-4">
        <Field idPrefix={`lead-${id}-`} name="status" label={t("form.status")} error={errors.status}>
          <select defaultValue={form.value("status", status)} className={inputClass}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix={`lead-${id}-`} name="adminNotes" label={t("form.notes")} hint={t("form.notesHint")} error={errors.adminNotes}>
          <textarea rows={4} maxLength={2000} defaultValue={form.value("adminNotes", notes)} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("form.save")}</SubmitButton>
    </form>
  );
}
