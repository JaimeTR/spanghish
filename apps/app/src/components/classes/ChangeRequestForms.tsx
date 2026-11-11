"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { IconSubmit } from "@/components/ui/IconButton";
import {
  cancelChangeRequest,
  createChangeRequest,
  decideChangeRequest,
  type DecideField,
  type NewRequestField,
} from "@/lib/sessions/change-requests";

export type SessionOption = { id: string; label: string };

/** Alumno: avisar que no asistirá o pedir un cambio de una de sus próximas clases. */
export function NewChangeRequestForm({ locale, studentId, sessions }: { locale: string; studentId: string; sessions: SessionOption[] }) {
  const t = useTranslations("classes.requests");
  const form = useFormAction<NewRequestField>(createChangeRequest);
  const errors = form.fieldErrors;
  return (
    <form action={form.formAction} noValidate className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <div key={form.formKey} className="space-y-4">
        <Field idPrefix="req-" name="sessionId" label={t("form.session")} error={errors.sessionId}>
          <select defaultValue={form.value("sessionId") ?? ""} className={inputClass}>
            <option value="">{t("form.choose")}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix="req-" name="kind" label={t("form.kind")} error={errors.kind}>
          <select defaultValue={form.value("kind", "absence")} className={inputClass}>
            <option value="absence">{t("kind.absence")}</option>
            <option value="reschedule">{t("kind.reschedule")}</option>
          </select>
        </Field>
        <Field idPrefix="req-" name="note" label={t("form.note")} hint={t("form.noteHint")} error={errors.note}>
          <textarea rows={3} maxLength={500} defaultValue={form.value("note")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.sending")}>{t("form.send")}</SubmitButton>
    </form>
  );
}

/** Alumno: cancelar una solicitud pendiente (solo icono). */
export function CancelChangeRequest({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("classes.requests");
  const form = useFormAction(cancelChangeRequest);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <IconSubmit tone="danger" label={t("cancelRequest")} icon={<X className="size-5" strokeWidth={2} />} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Docente o administración: aprobar o rechazar con una respuesta opcional. */
export function DecideChangeRequest({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("classes.requests");
  const form = useFormAction<DecideField>(decideChangeRequest);
  return (
    <form action={form.formAction} noValidate className="mt-3 space-y-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <div key={form.formKey}>
        <Field idPrefix={`decide-${id}-`} name="responseNote" label={t("form.response")} error={form.fieldErrors.responseNote}>
          <input
            type="text"
            maxLength={500}
            defaultValue={form.value("responseNote")}
            // Enter no debe aprobar sin querer: hay que pulsar Aprobar o Rechazar.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          className="inline-flex min-h-11 items-center rounded-md bg-success/12 px-4 font-semibold text-success ring-2 ring-success focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          {t("approve")}
        </button>
        <button
          type="submit"
          name="decision"
          value="declined"
          className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-4 font-semibold text-text hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          {t("decline")}
        </button>
      </div>
      <FormStatus state={form.state} />
    </form>
  );
}
