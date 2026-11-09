"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { PRICE_KINDS } from "@/lib/schemas/catalog";
import { deactivatePrice, savePrice, type PriceField } from "../actions";

type Option = { value: string; label: string };

export function PriceForm({
  locale,
  programId,
  editions,
  locations,
}: {
  locale: Locale;
  programId: string;
  editions: Option[];
  locations: Option[];
}) {
  const t = useTranslations("catalog.prices");
  const te = useTranslations("enums");
  const form = useFormAction<PriceField>(savePrice);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label={t("kind")} error={errors.kind}>
          <select defaultValue={form.value("kind", "per_lesson")} className={inputClass}>
            {PRICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {te(`priceKind.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field name="amount" label={t("amount")} error={errors.amount} hint={t("amountHint")}>
          <input type="text" inputMode="decimal" required maxLength={10} defaultValue={form.value("amount")} className={inputClass} />
        </Field>
        <Field name="lessonsIncluded" label={t("lessons")} error={errors.lessonsIncluded} hint={t("lessonsHint")}>
          <input type="number" inputMode="numeric" min={1} max={100} defaultValue={form.value("lessonsIncluded")} className={inputClass} />
        </Field>
        <Field name="editionId" label={t("edition")} error={errors.editionId}>
          <select defaultValue={form.value("editionId", "")} className={inputClass}>
            <option value="">{t("anyEdition")}</option>
            {editions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="locationId" label={t("location")} error={errors.locationId}>
          <select defaultValue={form.value("locationId", "")} className={inputClass}>
            <option value="">{t("anyLocation")}</option>
            {locations.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="labelEs" label={t("labelEs")} error={errors.labelEs}>
          <input type="text" lang="es" maxLength={120} defaultValue={form.value("labelEs")} className={inputClass} />
        </Field>
        <Field name="labelEn" label={t("labelEn")} error={errors.labelEn}>
          <input type="text" lang="en" maxLength={120} defaultValue={form.value("labelEn")} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("create")}</SubmitButton>
    </form>
  );
}

export function DeactivatePriceForm({
  locale,
  programId,
  priceId,
  description,
}: {
  locale: Locale;
  programId: string;
  priceId: string;
  description: string;
}) {
  const t = useTranslations("catalog.prices");
  const form = useFormAction<"priceId" | "programId">(deactivatePrice);
  return (
    <form action={form.formAction} className="flex flex-col items-start gap-1 sm:items-end">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="priceId" value={priceId} />
      <SubmitButton variant="secondary" pendingLabel={t("saving")}>
        {t("deactivate")}
        <span className="sr-only"> {description}</span>
      </SubmitButton>
      <FormStatus state={form.state} />
    </form>
  );
}
