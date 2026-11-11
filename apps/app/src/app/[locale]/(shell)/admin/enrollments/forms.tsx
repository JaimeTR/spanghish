"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { IconButton, IconSubmit } from "@/components/ui/IconButton";
import {
  confirmRequest,
  createEnrollment,
  recordPayment,
  saveRequestNotes,
  updateEnrollment,
  updateRequest,
  type ConfirmField,
  type EnrollmentField,
  type EnrollmentStatusField,
  type PaymentField,
  type RequestNotesField,
} from "./actions";

const ENROLLMENT_STATUSES = ["pending", "active", "paused", "completed", "cancelled"] as const;
const BILLING_MODES = ["upfront", "pack", "payg", "free"] as const;
const MANUAL_METHODS = ["transfer", "cash", "eventbrite", "other"] as const;

/** Centavos → texto de un campo de importe ("205" o "205.50"). */
function dollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export type EnrollmentOptions = {
  students: { id: string; name: string }[];
  groups: { id: string; label: string; programId: string }[];
  prices: { id: string; programId: string; label: string; kind: string; amountCents: number }[];
};

/** Alta manual de una matrícula. Al elegir un precio se rellenan la modalidad y el importe. */
export function EnrollmentForm({ locale, options, groupId }: { locale: string; options: EnrollmentOptions; groupId?: string }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction<EnrollmentField>(createEnrollment);
  const errors = form.fieldErrors;
  const [group, setGroup] = useState(groupId ?? "");
  const [priceId, setPriceId] = useState("");
  const [mode, setMode] = useState<string>("upfront");
  const [amount, setAmount] = useState("");
  const programId = options.groups.find((g) => g.id === group)?.programId;
  const prices = options.prices.filter((p) => p.programId === programId);

  function choosePrice(id: string) {
    setPriceId(id);
    const price = options.prices.find((p) => p.id === id);
    if (!price) return;
    setMode(price.kind === "upfront" ? "upfront" : price.kind === "pack" ? "pack" : "payg");
    setAmount(dollars(price.amountCents));
  }

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <Field idPrefix="enrol-" name="studentId" label={t("form.student")} error={errors.studentId}>
        <select key={form.formKey} defaultValue={form.value("studentId") ?? ""} className={inputClass}>
          <option value="">{t("form.choose")}</option>
          {options.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field idPrefix="enrol-" name="groupId" label={t("form.group")} error={errors.groupId}>
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setPriceId("");
          }}
          className={inputClass}
        >
          <option value="">{t("form.choose")}</option>
          {options.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field idPrefix="enrol-" name="priceId" label={t("form.price")} hint={t("form.priceHint")} error={errors.priceId}>
        <select value={priceId} onChange={(e) => choosePrice(e.target.value)} className={inputClass}>
          <option value="">{t("form.noPrice")}</option>
          {prices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field idPrefix="enrol-" name="billingMode" label={t("form.billingMode")} error={errors.billingMode}>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            {BILLING_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`billing.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix="enrol-" name="agreedAmount" label={t("form.agreedAmount")} hint={t("form.amountHint")} error={errors.agreedAmount}>
          <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field idPrefix="enrol-" name="startsOn" label={t("form.startsOn")} error={errors.startsOn}>
          <input type="date" defaultValue={form.value("startsOn")} className={inputClass} />
        </Field>
      </div>
      <Field idPrefix="enrol-" name="notes" label={t("form.notes")} error={errors.notes}>
        <textarea rows={2} maxLength={1000} defaultValue={form.value("notes")} className={inputClass} />
      </Field>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("form.create")}</SubmitButton>
    </form>
  );
}

/** Estado, importe acordado y notas de una matrícula. */
export function EnrollmentStatusForm({ locale, id, status, agreedCents, notes }: { locale: string; id: string; status: string; agreedCents: number | null; notes: string | null }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction<EnrollmentStatusField>(updateEnrollment, { status: "idle" }, true);
  const errors = form.fieldErrors;
  const prefix = `enrol-${id}-`;
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <div key={form.formKey} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field idPrefix={prefix} name="status" label={t("form.status")} hint={t("form.statusHint")} error={errors.status}>
            <select defaultValue={form.value("status", status)} className={inputClass}>
              {ENROLLMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix={prefix} name="agreedAmount" label={t("form.agreedAmount")} hint={t("form.amountHint")} error={errors.agreedAmount}>
            <input type="text" inputMode="decimal" defaultValue={form.value("agreedAmount", dollars(agreedCents))} className={inputClass} />
          </Field>
        </div>
        <Field idPrefix={prefix} name="notes" label={t("form.notes")} error={errors.notes}>
          <textarea rows={3} maxLength={1000} defaultValue={form.value("notes", notes)} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("form.save")}</SubmitButton>
    </form>
  );
}

function PaymentFields({ prefix, form, errors, amountCents }: { prefix: string; form: { value: (n: string, i?: string | number | null) => string | undefined }; errors: Partial<Record<string, import("@/lib/forms").FormErrorKey>>; amountCents: number }) {
  const t = useTranslations("adminEnrollments");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field idPrefix={prefix} name="method" label={t("form.method")} error={errors.method}>
          <select defaultValue={form.value("method", "transfer")} className={inputClass}>
            {MANUAL_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`method.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix={prefix} name="amount" label={t("form.amount")} hint={t("form.amountHint")} error={errors.amount}>
          <input type="text" inputMode="decimal" defaultValue={form.value("amount", dollars(amountCents))} className={inputClass} />
        </Field>
      </div>
      <Field idPrefix={prefix} name="reference" label={t("form.reference")} hint={t("form.referenceHint")} error={errors.reference}>
        <input type="text" maxLength={200} defaultValue={form.value("reference")} className={inputClass} />
      </Field>
      <Field idPrefix={prefix} name="note" label={t("form.note")} error={errors.note}>
        <input type="text" maxLength={500} defaultValue={form.value("note")} className={inputClass} />
      </Field>
    </>
  );
}

/** Registrar un pago manual de una matrícula (el saldo pendiente va como importe inicial). */
export function PaymentForm({ locale, enrollmentId, studentId, balanceCents }: { locale: string; enrollmentId: string; studentId: string; balanceCents: number }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction<PaymentField>(recordPayment);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div key={form.formKey} className="space-y-4">
        <PaymentFields prefix={`pay-${enrollmentId}-`} form={form} errors={form.fieldErrors} amountCents={balanceCents} />
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("form.recordPayment")}</SubmitButton>
    </form>
  );
}

/** Confirmar una prematrícula con un pago manual: crea la ficha del alumno, la matrícula y el pago. */
export function RequestConfirmForm({ locale, id, amountCents }: { locale: string; id: string; amountCents: number }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction<ConfirmField>(confirmRequest, { status: "idle" }, true);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-text-muted">{t("requests.confirmLead")}</p>
      <div key={form.formKey} className="space-y-4">
        <PaymentFields prefix={`confirm-${id}-`} form={form} errors={form.fieldErrors} amountCents={amountCents} />
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("requests.confirm")}</SubmitButton>
    </form>
  );
}

/** Ofrecer plaza (lista de espera o caducada): solo icono. */
export function RequestOffer({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction(updateRequest);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="offer" />
      <IconSubmit tone="primary" label={t("requests.offer")} icon={<Send className="size-5" strokeWidth={1.75} />} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Cancelar una prematrícula (libera la plaza), con confirmación. */
export function RequestCancel({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("adminEnrollments");
  const ts = useTranslations("shell");
  const form = useFormAction(updateRequest);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="cancel" />
      <ConfirmDelete label={t("requests.cancel")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Copia el enlace de pago de la persona (para enviárselo por correo o WhatsApp). */
export function CopyPayLink({ url }: { url: string }) {
  const t = useTranslations("adminEnrollments");
  const [copied, setCopied] = useState(false);
  return (
    <>
      <IconButton
        label={copied ? t("requests.copied") : t("requests.copyLink")}
        icon={copied ? <Check className="size-5" strokeWidth={2} /> : <Copy className="size-5" strokeWidth={1.75} />}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            window.prompt(t("requests.copyLink"), url);
          }
        }}
      />
      <span role="status" className="sr-only">
        {copied ? t("requests.copied") : ""}
      </span>
    </>
  );
}

export function RequestNotesForm({ locale, id, notes }: { locale: string; id: string; notes: string | null }) {
  const t = useTranslations("adminEnrollments");
  const form = useFormAction<RequestNotesField>(saveRequestNotes, { status: "idle" }, true);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <div key={form.formKey}>
        <Field idPrefix={`req-${id}-`} name="adminNotes" label={t("form.adminNotes")} error={form.fieldErrors.adminNotes}>
          <textarea rows={4} maxLength={2000} defaultValue={form.value("adminNotes", notes)} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{t("form.save")}</SubmitButton>
    </form>
  );
}
