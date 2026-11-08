"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { submitContact, type ContactState } from "@/app/[locale]/contact-us/actions";
import { HONEYPOT_FIELD, STARTED_AT_FIELD } from "@/lib/booking";
import { CONTACT_FIELDS, CONTACT_MAX, validateContact, type ContactErrors, type ContactField } from "@/lib/contact";
import type { Locale } from "@/i18n/routing";
import { CONTACT } from "@/lib/site";
import { ErrorText, TextField } from "./FormFields";
import { ArrowIcon } from "./icons";
import { btnPrimary } from "./styles";

type Values = { name: string; email: string; phone: string; message: string; consent: boolean };
const EMPTY: Values = { name: "", email: "", phone: "", message: "", consent: false };

/**
 * Formulario de contacto general (preguntas). Mismas reglas de validación en el
 * navegador y en el servidor que el de clase gratis, pero corto: sin pasos.
 */
export function ContactForm({ locale, privacyHref }: { locale: Locale; privacyHref: string }) {
  const t = useTranslations("page.contactForm");
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  const [values, setValues] = useState<Values>(EMPTY);
  const [clientErrors, setClientErrors] = useState<ContactErrors | null>(null);
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

  const errors: ContactErrors = pending ? {} : (clientErrors ?? (state.status === "invalid" ? state.errors : {}));

  const set = (name: keyof Values) => (e: { target: HTMLInputElement | HTMLTextAreaElement }) => {
    const value = name === "consent" ? (e.target as HTMLInputElement).checked : e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set(STARTED_AT_FIELD, startedAt.current);
    const result = validateContact(data);
    setClientErrors(result.ok ? null : result.errors);
    if (result.ok) startTransition(() => formAction(data));
  }

  const errorList = CONTACT_FIELDS.filter((f) => errors[f]);
  const message = (field: ContactField) => {
    const code = errors[field];
    if (!code) return undefined;
    const key = `errors.${field}.${code}`;
    return t.has(key) ? t(key) : t(`errors.${field}.required`);
  };
  const described = (field: ContactField, hint: boolean) =>
    [hint ? `f-${field}-hint` : "", errors[field] ? `f-${field}-error` : ""].filter(Boolean).join(" ") || undefined;
  const problem =
    !pending && !clientErrors && (state.status === "spam" || state.status === "unavailable" || state.status === "failed")
      ? state.status
      : null;

  return (
    <form noValidate action={formAction} onSubmit={onSubmit} className="flex flex-col gap-7">
      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          aria-labelledby="contact-error-summary-title"
          className="rounded-[1.25rem] border-2 border-danger bg-surface px-5 py-4 outline-none focus-visible:outline-3"
        >
          <h3 id="contact-error-summary-title" className="text-lg font-extrabold text-danger">
            {t("errorSummary", { count: errorList.length })}
          </h3>
          <ul className="mt-2 flex flex-col">
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#f-${f}`} className="inline-flex min-h-11 items-center font-semibold text-ink underline">
                  {message(f)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problem && errorList.length === 0 && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-[1.25rem] border-2 border-danger bg-surface px-5 py-4 text-lg leading-relaxed text-ink outline-none"
        >
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
      {/* Trampa para bots: fuera de la vista y del árbol de accesibilidad. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]">
        <label htmlFor="f-website-contact">{t("fields.honeypot")}</label>
        <input id="f-website-contact" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <TextField
        field="name"
        label={t("fields.name.label")}
        autoComplete="name"
        value={values.name}
        onChange={set("name")}
        error={message("name")}
        describedBy={described("name", false)}
        maxLength={CONTACT_MAX.name}
      />
      <div className="grid gap-7 md:grid-cols-2">
        <TextField
          field="email"
          type="email"
          label={t("fields.email.label")}
          hint={t("fields.email.hint")}
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          error={message("email")}
          describedBy={described("email", true)}
          maxLength={CONTACT_MAX.email}
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
          maxLength={CONTACT_MAX.phone}
        />
      </div>
      <TextField
        field="message"
        multiline
        rows={5}
        label={t("fields.message.label")}
        hint={t("fields.message.hint")}
        value={values.message}
        onChange={set("message")}
        error={message("message")}
        describedBy={described("message", true)}
        maxLength={CONTACT_MAX.message}
      />

      <div>
        <div className="flex items-start gap-3">
          <input
            id="f-consent"
            type="checkbox"
            name="consent"
            value="yes"
            checked={values.consent}
            onChange={set("consent")}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={described("consent", false)}
            className="mt-1 size-6 shrink-0 accent-brand-purple"
          />
          <label htmlFor="f-consent" className="leading-relaxed text-ink">
            {t.rich("fields.consent.label", {
              privacy: (chunks: ReactNode) => (
                <Link href={privacyHref} className="font-semibold text-brand-purple underline">
                  {chunks}
                </Link>
              ),
            })}
          </label>
        </div>
        <ErrorText field="consent" text={message("consent")} />
      </div>

      <div>
        <button type="submit" disabled={pending} className={`${btnPrimary} cursor-pointer disabled:cursor-wait disabled:opacity-80`}>
          {pending ? t("sending") : t("submit")}
          {!pending && <ArrowIcon />}
        </button>
      </div>
    </form>
  );
}
