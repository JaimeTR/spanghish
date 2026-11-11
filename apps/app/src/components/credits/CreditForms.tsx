"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { ModalButton } from "@/components/ui/Modal";
import { adjustPack, createPack, voidPack, type AdjustField, type PackField } from "@/lib/credits/actions";

/** Nuevo pack de clases de un alumno. */
export function NewPackForm({ locale, studentId, programs }: { locale: string; studentId: string; programs: { id: string; name: string }[] }) {
  const t = useTranslations("credits.form");
  const form = useFormAction<PackField>(createPack);
  const errors = form.fieldErrors;
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <div key={form.formKey} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field idPrefix="pack-" name="lessons" label={t("lessons")} error={errors.lessons}>
            <input type="number" min={1} max={200} inputMode="numeric" defaultValue={form.value("lessons", 10)} className={inputClass} />
          </Field>
          <Field idPrefix="pack-" name="programId" label={t("program")} hint={t("programHint")} error={errors.programId}>
            <select defaultValue={form.value("programId") ?? ""} className={inputClass}>
              <option value="">{t("anyProgram")}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix="pack-" name="startsOn" label={t("startsOn")} error={errors.startsOn}>
            <input type="date" defaultValue={form.value("startsOn")} className={inputClass} />
          </Field>
          <Field idPrefix="pack-" name="expiresOn" label={t("expiresOn")} hint={t("expiresHint")} error={errors.expiresOn}>
            <input type="date" defaultValue={form.value("expiresOn")} className={inputClass} />
          </Field>
          <Field idPrefix="pack-" name="amount" label={t("amount")} hint={t("amountHint")} error={errors.amount}>
            <input type="text" inputMode="decimal" defaultValue={form.value("amount")} className={inputClass} />
          </Field>
        </div>
        <Field idPrefix="pack-" name="note" label={t("note")} error={errors.note}>
          <input type="text" maxLength={300} defaultValue={form.value("note")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("create")}</SubmitButton>
    </form>
  );
}

function AdjustForm({ locale, packId, studentId }: { locale: string; packId: string; studentId: string }) {
  const t = useTranslations("credits.adjust");
  const form = useFormAction<AdjustField>(adjustPack);
  const errors = form.fieldErrors;
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="packId" value={packId} />
      <input type="hidden" name="studentId" value={studentId} />
      <p className="text-sm text-text-muted">{t("hint")}</p>
      <div key={form.formKey} className="space-y-4">
        <Field idPrefix={`adjust-${packId}-`} name="delta" label={t("delta")} hint={t("deltaHint")} error={errors.delta}>
          <input type="number" min={-100} max={100} inputMode="numeric" defaultValue={form.value("delta")} className={inputClass} />
        </Field>
        <Field idPrefix={`adjust-${packId}-`} name="note" label={t("note")} error={errors.note}>
          <input type="text" maxLength={300} defaultValue={form.value("note")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}

function VoidForm({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("credits");
  const ts = useTranslations("shell");
  const form = useFormAction(voidPack);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label={t("void")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Acciones de un pack: ajustar el saldo (modal) y anularlo. */
export function PackActions({ locale, packId, studentId, voided }: { locale: string; packId: string; studentId: string; voided: boolean }) {
  const t = useTranslations("credits");
  if (voided) return null;
  return (
    <div className="flex items-center">
      <ModalButton iconOnly label={t("adjustTitle")} title={t("adjustTitle")} icon={<SlidersHorizontal className="size-5" strokeWidth={1.75} />} size="md">
        <AdjustForm locale={locale} packId={packId} studentId={studentId} />
      </ModalButton>
      <VoidForm locale={locale} id={packId} />
    </div>
  );
}

