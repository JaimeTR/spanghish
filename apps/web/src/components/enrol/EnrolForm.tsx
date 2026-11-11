"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { submitEnrolment, type EnrolState } from "@/app/[locale]/enrol/actions";
import type { Locale } from "@/i18n/routing";
import { HONEYPOT_FIELD, STARTED_AT_FIELD } from "@/lib/booking";
import { audFromCents } from "@/lib/editions";
import { ENROL_FIELDS, ENROL_MAX, validateEnrol, type EnrolErrors, type EnrolField, type GroupPrice } from "@/lib/enrol";
import { CONTACT } from "@/lib/site";
import { ChoiceField, ErrorText, fieldBad, fieldBase, fieldOk, Label, TextField } from "../FormFields";
import { ArrowIcon } from "../icons";
import { btnPrimary } from "../styles";

type Values = {
  priceId: string;
  name: string;
  birthDate: string;
  guardianName: string;
  guardianRelationship: string;
  email: string;
  phone: string;
  method: string;
  message: string;
  consent: boolean;
  terms: boolean;
};

/**
 * Formulario de reserva de plaza. Mismas reglas en el navegador y en el servidor
 * (lib/enrol.ts). `minor`: grupo de niños → datos del menor y de su tutor, con consentimiento.
 * `full`: grupo completo → lista de espera (no se cobra nada).
 */
export function EnrolForm({
  locale,
  groupId,
  prices,
  minor,
  full,
  termsHref,
  privacyHref,
}: {
  locale: Locale;
  groupId: string;
  prices: GroupPrice[];
  minor: boolean;
  full: boolean;
  termsHref: string;
  privacyHref: string;
}) {
  const t = useTranslations("enrol.form");
  const tp = useTranslations("enrol.price");
  const [state, formAction, pending] = useActionState<EnrolState, FormData>(submitEnrolment, { status: "idle" });
  const [values, setValues] = useState<Values>({
    priceId: prices.length === 1 ? prices[0]!.id : "",
    name: "",
    birthDate: "",
    guardianName: "",
    guardianRelationship: "parent",
    email: "",
    phone: "",
    method: "stripe",
    message: "",
    consent: false,
    terms: false,
  });
  const [clientErrors, setClientErrors] = useState<EnrolErrors | null>(null);
  const startedAt = useRef("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = String(Date.now());
  }, []);
  useEffect(() => {
    if (clientErrors) summaryRef.current?.focus();
  }, [clientErrors]);
  useEffect(() => {
    if (state.status !== "idle") (summaryRef.current ?? statusRef.current)?.focus();
  }, [state]);

  const errors: EnrolErrors = pending ? {} : (clientErrors ?? (state.status === "invalid" ? state.errors : {}));
  const set = (name: keyof Values) => (e: { target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }) => {
    const target = e.target as HTMLInputElement;
    const value = name === "consent" || name === "terms" ? target.checked : target.value;
    setValues((v) => ({ ...v, [name]: value }));
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set(STARTED_AT_FIELD, startedAt.current);
    const result = validateEnrol(data, minor);
    setClientErrors(result.ok ? null : result.errors);
    if (result.ok) startTransition(() => formAction(data));
  }

  const errorList = ENROL_FIELDS.filter((f) => errors[f]);
  const message = (field: EnrolField) => {
    const code = errors[field];
    return code ? t(`errors.${field}.${code === "invalid" && !t.has(`errors.${field}.invalid`) ? "required" : code}`) : undefined;
  };
  const described = (field: EnrolField, hint: boolean) =>
    [hint ? `f-${field}-hint` : "", errors[field] ? `f-${field}-error` : ""].filter(Boolean).join(" ") || undefined;
  const problem = !pending && !clientErrors && state.status !== "idle" && state.status !== "invalid" ? state.status : null;

  const priceLabel = (p: GroupPrice) =>
    `${p.kind === "pack" ? tp("pack", { count: p.lessonsIncluded ?? 0 }) : tp(p.kind)} · ${audFromCents(p.amountCents)}`;

  return (
    <form noValidate action={formAction} onSubmit={onSubmit} className="flex flex-col gap-7">
      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} aria-labelledby="enrol-error-summary-title" className="rounded-[1.25rem] border-2 border-danger bg-surface px-5 py-4 outline-none focus-visible:outline-3">
          <h3 id="enrol-error-summary-title" className="text-lg font-extrabold text-danger">
            {t("errorSummary", { count: errorList.length })}
          </h3>
          <ul className="mt-2 flex flex-col">
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#f-${f === "priceId" ? `priceId-${prices[0]?.id ?? ""}` : f === "method" ? "method-stripe" : f}`} className="inline-flex min-h-11 items-center font-semibold text-ink underline">
                  {message(f)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problem && errorList.length === 0 && (
        <div ref={statusRef} tabIndex={-1} role="alert" className="rounded-[1.25rem] border-2 border-danger bg-surface px-5 py-4 text-lg leading-relaxed text-ink outline-none">
          <p>{t(`status.${problem}`)}</p>
          <p className="mt-2 flex flex-wrap gap-x-6 font-bold">
            <a href={`tel:${CONTACT.phoneE164}`} className="inline-flex min-h-11 items-center text-brand-purple underline">
              {CONTACT.phoneDisplay}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center text-brand-purple underline">
              {CONTACT.email}
            </a>
          </p>
        </div>
      )}

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="groupId" value={groupId} />
      {/* Trampa para bots: fuera de la vista y del árbol de accesibilidad. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]">
        <label htmlFor="f-website-enrol">{t("fields.honeypot")}</label>
        <input id="f-website-enrol" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <ChoiceField
        field="priceId"
        label={t("fields.priceId.label")}
        options={prices.map((p) => ({ value: p.id, label: priceLabel(p) }))}
        value={values.priceId}
        onChange={set("priceId")}
        error={message("priceId")}
        describedBy={described("priceId", false)}
      />

      <TextField
        field="name"
        label={minor ? t("fields.name.labelMinor") : t("fields.name.label")}
        autoComplete={minor ? "off" : "name"}
        value={values.name}
        onChange={set("name")}
        error={message("name")}
        describedBy={described("name", false)}
        maxLength={ENROL_MAX.name}
      />

      <div>
        <Label htmlFor="f-birthDate" label={t("fields.birthDate.label")} optional={minor ? undefined : t("optional")} />
        <input
          id="f-birthDate"
          name="birthDate"
          type="date"
          autoComplete={minor ? "off" : "bday"}
          value={values.birthDate}
          onChange={set("birthDate")}
          aria-invalid={errors.birthDate ? true : undefined}
          aria-describedby={described("birthDate", false)}
          className={`${fieldBase} ${errors.birthDate ? fieldBad : fieldOk} mt-2 max-w-64`}
        />
        <ErrorText field="birthDate" text={message("birthDate")} />
      </div>

      {minor && (
        <div className="grid gap-7 md:grid-cols-[2fr_1fr]">
          <TextField
            field="guardianName"
            label={t("fields.guardianName.label")}
            autoComplete="name"
            value={values.guardianName}
            onChange={set("guardianName")}
            error={message("guardianName")}
            describedBy={described("guardianName", false)}
            maxLength={ENROL_MAX.name}
          />
          <div>
            <Label htmlFor="f-guardianRelationship" label={t("fields.guardianRelationship.label")} />
            <select id="f-guardianRelationship" name="guardianRelationship" value={values.guardianRelationship} onChange={set("guardianRelationship")} className={`${fieldBase} ${fieldOk} mt-2`}>
              {(["parent", "legal_guardian", "other"] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`fields.guardianRelationship.${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid gap-7 md:grid-cols-2">
        <TextField
          field="email"
          type="email"
          label={t("fields.email.label")}
          hint={minor ? t("fields.email.hintMinor") : t("fields.email.hint")}
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          error={message("email")}
          describedBy={described("email", true)}
          maxLength={ENROL_MAX.email}
        />
        <TextField
          field="phone"
          type="tel"
          label={t("fields.phone.label")}
          optional={t("optional")}
          hint={t("fields.phone.hint")}
          autoComplete="tel"
          value={values.phone}
          onChange={set("phone")}
          error={message("phone")}
          describedBy={described("phone", true)}
          maxLength={ENROL_MAX.phone}
        />
      </div>

      {full ? (
        <input type="hidden" name="method" value="transfer" />
      ) : (
        <ChoiceField
          field="method"
          label={t("fields.method.label")}
          options={[
            { value: "stripe", label: t("fields.method.stripe") },
            { value: "transfer", label: t("fields.method.transfer") },
          ]}
          value={values.method}
          onChange={set("method")}
          error={message("method")}
          describedBy={described("method", false)}
        />
      )}

      <TextField
        field="message"
        multiline
        rows={3}
        label={t("fields.message.label")}
        optional={t("optional")}
        hint={t("fields.message.hint")}
        value={values.message}
        onChange={set("message")}
        describedBy="f-message-hint"
        maxLength={ENROL_MAX.message}
      />

      {minor && (
        <div>
          <div className="flex items-start gap-3">
            <input id="f-consent" type="checkbox" name="consent" value="yes" checked={values.consent} onChange={set("consent")} aria-invalid={errors.consent ? true : undefined} aria-describedby={described("consent", false)} className="mt-1 size-6 shrink-0 accent-brand-purple" />
            <label htmlFor="f-consent" className="leading-relaxed text-ink">
              {t("fields.consent.label")}
            </label>
          </div>
          <ErrorText field="consent" text={message("consent")} />
        </div>
      )}

      <div>
        <div className="flex items-start gap-3">
          <input id="f-terms" type="checkbox" name="terms" value="yes" checked={values.terms} onChange={set("terms")} aria-invalid={errors.terms ? true : undefined} aria-describedby={described("terms", false)} className="mt-1 size-6 shrink-0 accent-brand-purple" />
          <label htmlFor="f-terms" className="leading-relaxed text-ink">
            {t.rich("fields.terms.label", {
              terms: (chunks: ReactNode) => (
                <Link href={termsHref} target="_blank" className="font-semibold text-brand-purple underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks: ReactNode) => (
                <Link href={privacyHref} target="_blank" className="font-semibold text-brand-purple underline">
                  {chunks}
                </Link>
              ),
            })}
          </label>
        </div>
        <ErrorText field="terms" text={message("terms")} />
      </div>

      <div>
        <button type="submit" disabled={pending} className={`${btnPrimary} cursor-pointer disabled:cursor-wait disabled:opacity-80`}>
          {pending ? t("sending") : full ? t("submitWaitlist") : t("submit")}
          {!pending && <ArrowIcon />}
        </button>
      </div>
    </form>
  );
}
