"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { IconSubmit } from "@/components/ui/IconButton";
import { cancelSession, restoreSession, type CancelField } from "@/lib/sessions/actions";

/** Cancelar una clase con un motivo (administración y docente de ese grupo). */
export function CancelSessionForm({ locale, sessionId }: { locale: string; sessionId: string }) {
  const t = useTranslations("classes.calendar");
  const form = useFormAction<CancelField>(cancelSession, { status: "idle" }, true);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="text-sm text-text-muted">{t("cancelHint")}</p>
      <div key={form.formKey}>
        <Field idPrefix={`cancel-${sessionId}-`} name="reason" label={t("reason")} error={form.fieldErrors.reason}>
          <input type="text" maxLength={300} defaultValue={form.value("reason")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("cancelling")}>{t("cancelButton")}</SubmitButton>
    </form>
  );
}

/** Reactivar una clase cancelada: solo icono. */
export function RestoreSession({ locale, sessionId }: { locale: string; sessionId: string }) {
  const t = useTranslations("classes.calendar");
  const form = useFormAction(restoreSession);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <IconSubmit label={t("restore")} icon={<RotateCcw className="size-5" strokeWidth={1.75} />} />
      <FormStatus state={form.state} />
    </form>
  );
}
