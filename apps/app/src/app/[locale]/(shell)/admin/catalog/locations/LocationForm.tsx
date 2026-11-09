"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { LOCATION_KINDS, REGIONS } from "@/lib/schemas/catalog";
import { saveLocation, type LocationField } from "./actions";

export type LocationFormValues = {
  id: string;
  name: string;
  kind: string;
  region: string;
  address: string | null;
  map_url: string | null;
  active: boolean;
};

/**
 * Formulario de sede. El prefijo de ids distingue los campos cuando hay varios
 * formularios en la página (alta + edición de cada sede).
 */
export function LocationForm({ locale, location }: { locale: Locale; location?: LocationFormValues }) {
  const t = useTranslations("catalog.locations");
  const te = useTranslations("enums");
  const form = useFormAction<LocationField>(saveLocation);
  const errors = form.fieldErrors;
  const p = location ? `loc-${location.id}-` : "loc-new-";

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <div key={form.formKey} className="grid gap-4 sm:grid-cols-2">
        <Field idPrefix={p} name="name" label={t("name")} error={errors.name}>
          <input type="text" required maxLength={120} defaultValue={form.value("name", location?.name)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="kind" label={t("kind")} error={errors.kind}>
          <select defaultValue={form.value("kind", location?.kind ?? "library")} className={inputClass}>
            {LOCATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {te(`locationKind.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix={p} name="region" label={t("region")} error={errors.region}>
          <select defaultValue={form.value("region", location?.region ?? "sunshine_coast")} className={inputClass}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {te(`region.${r}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix={p} name="address" label={t("address")} error={errors.address} hint={t("addressHint")}>
          <input type="text" maxLength={300} defaultValue={form.value("address", location?.address)} className={inputClass} />
        </Field>
        <Field idPrefix={p} name="mapUrl" label={t("mapUrl")} error={errors.mapUrl} hint={t("mapUrlHint")}>
          <input type="url" maxLength={500} defaultValue={form.value("mapUrl", location?.map_url)} className={inputClass} />
        </Field>
        <div className="self-end">
          <Checkbox idPrefix={p} name="active" label={t("active")} defaultChecked={form.checked("active", location?.active ?? true)} />
        </div>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{location ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
