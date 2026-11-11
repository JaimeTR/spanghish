"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { IconSubmit } from "@/components/ui/IconButton";
import { addRule, deleteRule, generateSessions, type GenerateField, type RuleField } from "./schedule-actions";

export type RuleRow = { id: string; weekday: number; startTime: string; durationMinutes: number; startsOn: string; endsOn: string | null };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function RuleDelete({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("classes.schedule");
  const form = useFormAction(deleteRule);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <IconSubmit tone="danger" label={t("deleteRule")} icon={<Trash2 className="size-5" strokeWidth={1.75} />} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Horarios semanales de un grupo, para añadir y quitar, y botón para generar las clases. */
export function ScheduleManager({ locale, groupId, rules, today, defaultUntil }: { locale: string; groupId: string; rules: RuleRow[]; today: string; defaultUntil: string }) {
  const t = useTranslations("classes.schedule");
  const add = useFormAction<RuleField>(addRule);
  const gen = useFormAction<GenerateField>(generateSessions, { status: "idle" }, true);
  const errors = add.fieldErrors;

  return (
    <div className="space-y-8">
      <section aria-labelledby={`rules-${groupId}`}>
        <h3 id={`rules-${groupId}`} className="text-base font-bold text-text">
          {t("rules")}
        </h3>
        {rules.length === 0 ? (
          <p className="mt-2 text-text-muted">{t("noRules")}</p>
        ) : (
          <ul className="mt-2 list-none divide-y divide-line rounded-md border border-line p-0">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="font-semibold">{t(`weekdays.${r.weekday}`)}</span> {r.startTime.slice(0, 5)} · {t("minutes", { count: r.durationMinutes })}
                  <span className="block text-sm text-text-muted">{r.endsOn ? t("fromTo", { from: r.startsOn, to: r.endsOn }) : t("from", { from: r.startsOn })}</span>
                </span>
                <RuleDelete id={r.id} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={add.formAction} noValidate className="space-y-4">
        <input type="hidden" name="uiLocale" value={locale} />
        <input type="hidden" name="groupId" value={groupId} />
        <h3 className="text-base font-bold text-text">{t("addRule")}</h3>
        <div key={add.formKey} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field idPrefix={`rule-${groupId}-`} name="weekday" label={t("weekday")} error={errors.weekday}>
              <select defaultValue={add.value("weekday", 1)} className={inputClass}>
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {t(`weekdays.${d}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field idPrefix={`rule-${groupId}-`} name="startTime" label={t("startTime")} error={errors.startTime}>
              <input type="time" defaultValue={add.value("startTime", "18:00")} className={inputClass} />
            </Field>
            <Field idPrefix={`rule-${groupId}-`} name="durationMinutes" label={t("duration")} error={errors.durationMinutes}>
              <input type="number" min={15} max={240} inputMode="numeric" defaultValue={add.value("durationMinutes", 70)} className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field idPrefix={`rule-${groupId}-`} name="startsOn" label={t("startsOn")} error={errors.startsOn}>
              <input type="date" defaultValue={add.value("startsOn", today)} className={inputClass} />
            </Field>
            <Field idPrefix={`rule-${groupId}-`} name="endsOn" label={t("endsOn")} hint={t("endsOnHint")} error={errors.endsOn}>
              <input type="date" defaultValue={add.value("endsOn")} className={inputClass} />
            </Field>
          </div>
        </div>
        <FormStatus state={add.state} />
        <SubmitButton pendingLabel={t("saving")}>{t("addRuleButton")}</SubmitButton>
      </form>

      <form action={gen.formAction} noValidate className="space-y-4 border-t border-line pt-6">
        <input type="hidden" name="uiLocale" value={locale} />
        <input type="hidden" name="groupId" value={groupId} />
        <h3 className="text-base font-bold text-text">{t("generate")}</h3>
        <p className="text-sm text-text-muted">{t("generateHint")}</p>
        <div key={gen.formKey}>
          <Field idPrefix={`gen-${groupId}-`} name="until" label={t("until")} error={gen.fieldErrors.until}>
            <input type="date" defaultValue={gen.value("until", defaultUntil)} className={inputClass} />
          </Field>
        </div>
        <FormStatus state={gen.state} />
        <SubmitButton pendingLabel={t("generating")}>{t("generateButton")}</SubmitButton>
      </form>
    </div>
  );
}
