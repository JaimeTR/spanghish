"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { addClosure, deleteClosure, type ClosureField } from "@/lib/classes/closures";

export type ClosureRow = { id: string; range: string; place: string; reason: string };

function ClosureDelete({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("classes.closures");
  const ts = useTranslations("shell");
  const form = useFormAction(deleteClosure);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Cierres (festivos) próximos y formulario para agregar uno. Al agregarlo se cancelan las clases que caen dentro. */
export function ClosuresManager({ locale, closures, locations }: { locale: string; closures: ClosureRow[]; locations: { id: string; name: string }[] }) {
  const t = useTranslations("classes.closures");
  const form = useFormAction<ClosureField>(addClosure);
  const errors = form.fieldErrors;
  return (
    <div className="space-y-8">
      <section aria-labelledby="closures-list">
        <h3 id="closures-list" className="text-base font-bold text-text">
          {t("upcoming")}
        </h3>
        {closures.length === 0 ? (
          <p className="mt-2 text-text-muted">{t("none")}</p>
        ) : (
          <ul className="mt-2 list-none divide-y divide-line rounded-md border border-line p-0">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="font-semibold">{c.range}</span>
                  <span className="block text-sm text-text-muted">
                    {c.place}
                    {c.reason ? ` · ${c.reason}` : ""}
                  </span>
                </span>
                <ClosureDelete locale={locale} id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={form.formAction} noValidate className="space-y-4">
        <input type="hidden" name="uiLocale" value={locale} />
        <h3 className="text-base font-bold text-text">{t("add")}</h3>
        <p className="text-sm text-text-muted">{t("addHint")}</p>
        <div key={form.formKey} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field idPrefix="closure-" name="startsOn" label={t("startsOn")} error={errors.startsOn}>
              <input type="date" defaultValue={form.value("startsOn")} className={inputClass} />
            </Field>
            <Field idPrefix="closure-" name="endsOn" label={t("endsOn")} hint={t("endsOnHint")} error={errors.endsOn}>
              <input type="date" defaultValue={form.value("endsOn")} className={inputClass} />
            </Field>
          </div>
          <Field idPrefix="closure-" name="locationId" label={t("location")} hint={t("locationHint")} error={errors.locationId}>
            <select defaultValue={form.value("locationId") ?? ""} className={inputClass}>
              <option value="">{t("allLocations")}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field idPrefix="closure-" name="reasonEs" label={t("reasonEs")} error={errors.reasonEs}>
              <input type="text" maxLength={200} defaultValue={form.value("reasonEs")} className={inputClass} />
            </Field>
            <Field idPrefix="closure-" name="reasonEn" label={t("reasonEn")} error={errors.reasonEn}>
              <input type="text" maxLength={200} defaultValue={form.value("reasonEn")} className={inputClass} />
            </Field>
          </div>
        </div>
        <FormStatus state={form.state} />
        <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
      </form>
    </div>
  );
}
