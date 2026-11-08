"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { submitBooking, type BookingState } from "@/app/[locale]/bookings/actions";
import type { Locale } from "@/i18n/routing";
import {
  AUDIENCE_OPTIONS,
  BOOKING_FIELDS,
  HONEYPOT_FIELD,
  LANGUAGE_OPTIONS,
  MAX_LENGTH,
  PLACE_OPTIONS,
  STARTED_AT_FIELD,
  validateBooking,
  type BookingErrors,
  type BookingField,
} from "@/lib/booking";
import { CONTACT } from "@/lib/site";
import { ArrowIcon } from "./icons";
import { btnPrimary } from "./styles";

const fieldBase =
  "block w-full rounded-[1rem] border-2 bg-surface px-4 py-3 text-lg text-ink transition-colors duration-200 hover:border-brand-purple";
const fieldOk = "border-ink/35";
const fieldBad = "border-danger";

type Values = Record<"name" | "email" | "phone" | "audience" | "place" | "times" | "language" | "message", string> & {
  consent: boolean;
};
const EMPTY: Values = { name: "", email: "", phone: "", audience: "", place: "", times: "", language: "", message: "", consent: false };

/** Id del control al que lleva cada error del resumen (en radios, la primera opción). */
function fieldId(field: BookingField): string {
  if (field === "audience") return `f-audience-${AUDIENCE_OPTIONS[0]}`;
  if (field === "place") return `f-place-${PLACE_OPTIONS[0]}`;
  if (field === "language") return `f-language-${LANGUAGE_OPTIONS[0]}`;
  return `f-${field}`;
}

/**
 * Formulario de solicitud de clase gratis. Valida en el navegador con las
 * mismas reglas que el servidor; al fallar, el resumen de errores recibe el
 * foco y cada campo marca su error (aria-invalid + texto asociado).
 */
export function BookingForm({ locale, privacyHref }: { locale: Locale; privacyHref: string }) {
  const t = useTranslations("page.bookings");
  const [state, formAction, pending] = useActionState<BookingState, FormData>(submitBooking, { status: "idle" });
  const [values, setValues] = useState<Values>(EMPTY);
  // Errores del último envío validado en el navegador (null = pasó la validación).
  const [clientErrors, setClientErrors] = useState<BookingErrors | null>(null);
  const startedAt = useRef("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Marca de tiempo antispam: cuándo se mostró el formulario a una persona.
  useEffect(() => {
    startedAt.current = String(Date.now());
  }, []);

  // Tras cada intento fallido, el foco va al resumen de errores o al aviso.
  useEffect(() => {
    if (clientErrors) summaryRef.current?.focus();
  }, [clientErrors]);
  useEffect(() => {
    if (state.status !== "idle") (summaryRef.current ?? statusRef.current)?.focus();
  }, [state]);

  const errors: BookingErrors = pending ? {} : (clientErrors ?? (state.status === "invalid" ? state.errors : {}));

  const set = (name: keyof Values) => (e: { target: HTMLInputElement | HTMLTextAreaElement }) => {
    const value = name === "consent" ? (e.target as HTMLInputElement).checked : e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set(STARTED_AT_FIELD, startedAt.current);
    const result = validateBooking(data);
    setClientErrors(result.ok ? null : result.errors);
    if (result.ok) startTransition(() => formAction(data));
  }

  const errorList = BOOKING_FIELDS.filter((f) => errors[f]);
  const message = (field: BookingField) => {
    const code = errors[field];
    if (!code) return undefined;
    const key = `errors.${field}.${code}`;
    return t.has(key) ? t(key) : t(`errors.${field}.required`);
  };
  const described = (field: BookingField, hint: boolean) =>
    [hint ? `f-${field}-hint` : "", errors[field] ? `f-${field}-error` : ""].filter(Boolean).join(" ") || undefined;
  const problem =
    !pending && !clientErrors && (state.status === "spam" || state.status === "unavailable" || state.status === "failed")
      ? state.status
      : null;

  return (
    // `action` solo actúa sin JavaScript (POST a la acción de servidor, nunca GET con
    // datos en la URL). Con JavaScript, onSubmit valida antes y envía él mismo.
    <form noValidate action={formAction} onSubmit={onSubmit} aria-describedby="booking-intro" className="flex flex-col gap-8">
      <p id="booking-intro" className="text-ink-muted">
        {t("formIntro")}
      </p>

      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          aria-labelledby="error-summary-title"
          className="rounded-[1.25rem] border-2 border-danger bg-surface px-5 py-4 outline-none focus-visible:outline-3"
        >
          <h3 id="error-summary-title" className="text-lg font-extrabold text-danger">
            {t("errorSummary", { count: errorList.length })}
          </h3>
          <ul className="mt-2 flex flex-col">
            {errorList.map((f) => (
              <li key={f}>
                <a href={`#${fieldId(f)}`} className="inline-flex min-h-11 items-center font-semibold text-ink underline">
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
        <label htmlFor="f-website">{t("fields.honeypot")}</label>
        <input id="f-website" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <TextField
        field="name"
        label={t("fields.name.label")}
        hint={t("fields.name.hint")}
        autoComplete="name"
        value={values.name}
        onChange={set("name")}
        error={message("name")}
        describedBy={described("name", true)}
        maxLength={MAX_LENGTH.name}
      />
      <div className="grid gap-8 md:grid-cols-2">
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
          maxLength={MAX_LENGTH.email}
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
          maxLength={MAX_LENGTH.phone}
        />
      </div>

      <ChoiceField
        field="audience"
        label={t("fields.audience.label")}
        options={AUDIENCE_OPTIONS.map((o) => ({ value: o, label: t(`fields.audience.options.${o}`) }))}
        value={values.audience}
        onChange={set("audience")}
        error={message("audience")}
        describedBy={described("audience", false)}
      />
      <ChoiceField
        field="place"
        label={t("fields.place.label")}
        hint={t("fields.place.hint")}
        options={PLACE_OPTIONS.map((o) => ({ value: o, label: t(`fields.place.options.${o}`) }))}
        value={values.place}
        onChange={set("place")}
        error={message("place")}
        describedBy={described("place", true)}
      />
      <TextField
        field="times"
        multiline
        rows={3}
        label={t("fields.times.label")}
        hint={t("fields.times.hint")}
        value={values.times}
        onChange={set("times")}
        error={message("times")}
        describedBy={described("times", true)}
        maxLength={MAX_LENGTH.times}
      />
      <ChoiceField
        field="language"
        label={t("fields.language.label")}
        options={LANGUAGE_OPTIONS.map((o) => ({ value: o, label: t(`fields.language.options.${o}`) }))}
        value={values.language}
        onChange={set("language")}
        error={message("language")}
        describedBy={described("language", false)}
      />
      <TextField
        field="message"
        multiline
        rows={4}
        label={t("fields.message.label")}
        optional={t("optional")}
        hint={t("fields.message.hint")}
        value={values.message}
        onChange={set("message")}
        error={message("message")}
        describedBy={described("message", true)}
        maxLength={MAX_LENGTH.message}
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

function ErrorText({ field, text }: { field: BookingField; text?: string }) {
  if (!text) return null;
  return (
    <p id={`f-${field}-error`} className="mt-2 font-semibold text-danger">
      {text}
    </p>
  );
}

function Label({ htmlFor, label, optional }: { htmlFor: string; label: string; optional?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-lg font-extrabold text-ink">
      {label}
      {optional && <span className="font-semibold text-ink-muted"> {optional}</span>}
    </label>
  );
}

function TextField({
  field,
  label,
  optional,
  hint,
  error,
  describedBy,
  multiline = false,
  rows,
  type = "text",
  autoComplete,
  value,
  onChange,
  maxLength,
}: {
  field: BookingField;
  label: string;
  optional?: string;
  hint?: string;
  error?: string;
  describedBy?: string;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  value: string;
  onChange: (e: { target: HTMLInputElement | HTMLTextAreaElement }) => void;
  maxLength: number;
}) {
  const id = `f-${field}`;
  const common = {
    id,
    name: field,
    value,
    onChange,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${fieldBase} ${error ? fieldBad : fieldOk} mt-2`,
  };
  return (
    <div>
      <Label htmlFor={id} label={label} optional={optional} />
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-ink-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...common} rows={rows} autoComplete="off" />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} spellCheck={type === "text" ? undefined : false} />
      )}
      <ErrorText field={field} text={error} />
    </div>
  );
}

function ChoiceField({
  field,
  label,
  hint,
  options,
  value,
  onChange,
  error,
  describedBy,
}: {
  field: BookingField;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: HTMLInputElement }) => void;
  error?: string;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-lg font-extrabold text-ink">{label}</legend>
      {hint && (
        <p id={`f-${field}-hint`} className="mt-0.5 text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const id = `f-${field}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-full border-2 bg-surface px-4 py-2 font-semibold text-ink transition-colors duration-200 hover:border-brand-purple has-[:checked]:border-brand-purple has-[:checked]:bg-brand-purple has-[:checked]:text-on-structure has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-[var(--focus-color)] ${
                error ? fieldBad : "border-ink/20"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={field}
                value={o.value}
                checked={value === o.value}
                onChange={onChange}
                className="size-5 shrink-0 accent-brand-yellow focus-visible:outline-none"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      <ErrorText field={field} text={error} />
    </fieldset>
  );
}
