"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { BilingualField } from "@/components/forms/BilingualField";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { GRADE_SCALES, TEST_VISIBILITIES, type TestField } from "@/lib/schemas/tests";
import { saveTest } from "./actions";

export type TestFormValues = {
  id: string;
  slug: string;
  title_es: string;
  title_en: string;
  description_es: string | null;
  description_en: string | null;
  level_id: string | null;
  audience: string | null;
  access_level: string;
  visibility: string;
  in_resources: boolean;
  pass_percent: number;
  grade_scale: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  questions_per_attempt: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
};

const legend = "mb-3 text-base font-semibold text-text";
const box = "rounded-md border border-line p-4";

/** Ajustes de un test: datos, quién lo ve, nota y comportamiento dinámico. */
export function TestForm({
  locale,
  test,
  levels,
}: {
  locale: Locale;
  test?: TestFormValues;
  levels: { id: string; code: string }[];
}) {
  const t = useTranslations("tests.form");
  const tv = useTranslations("tests.visibility");
  const ta = useTranslations("enums.accessLevel");
  const te = useTranslations("enums.audience");
  const form = useFormAction<TestField>(saveTest, { status: "idle" }, Boolean(test));
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      {test ? <input type="hidden" name="id" value={test.id} /> : null}
      <div key={form.formKey} className="space-y-5">
        <fieldset className={box}>
          <legend className={legend}>{t("data")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <BilingualField
                name="title"
                label={t("title")}
                maxLength={120}
                errors={errors}
                defaultValues={{ es: form.value("titleEs", test?.title_es), en: form.value("titleEn", test?.title_en) }}
              />
            </div>
            <div className="sm:col-span-2">
              <BilingualField
                name="description"
                label={t("description")}
                maxLength={500}
                multiline
                errors={errors}
                defaultValues={{ es: form.value("descriptionEs", test?.description_es), en: form.value("descriptionEn", test?.description_en) }}
              />
            </div>
            <Field name="slug" label={t("slug")} error={errors.slug} hint={t("slugHint")}>
              <input type="text" maxLength={80} defaultValue={form.value("slug", test?.slug)} className={inputClass} />
            </Field>
            <Field name="levelId" label={t("level")} error={errors.levelId}>
              <select defaultValue={form.value("levelId", test?.level_id ?? "")} className={inputClass}>
                <option value="">{t("anyLevel")}</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="audience" label={t("audience")} error={errors.audience}>
              <select defaultValue={form.value("audience", test?.audience ?? "")} className={inputClass}>
                <option value="">{t("anyAudience")}</option>
                {(["kids", "adults", "mature"] as const).map((a) => (
                  <option key={a} value={a}>
                    {te(a)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}>{t("sharing")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="visibility" label={t("visibility")} error={errors.visibility} hint={t("visibilityHint")}>
              <select defaultValue={form.value("visibility", test?.visibility ?? "portal")} className={inputClass}>
                {TEST_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {tv(`${v}.name`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="accessLevel" label={t("access")} error={errors.accessLevel} hint={t("accessHint")}>
              <select defaultValue={form.value("accessLevel", test?.access_level ?? "enrolled")} className={inputClass}>
                {(["public", "account", "enrolled"] as const).map((a) => (
                  <option key={a} value={a}>
                    {ta(a)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Checkbox
                name="inResources"
                label={t("inResources")}
                hint={t("inResourcesHint")}
                defaultChecked={form.checked("inResources", test?.in_resources ?? false)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}>{t("grading")}</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="passPercent" label={t("passPercent")} error={errors.passPercent}>
              <input type="number" min={1} max={100} defaultValue={form.value("passPercent", test?.pass_percent ?? 60)} className={inputClass} />
            </Field>
            <Field name="gradeScale" label={t("gradeScale")} error={errors.gradeScale} hint={t("gradeScaleHint")}>
              <select defaultValue={form.value("gradeScale", String(test?.grade_scale ?? 10))} className={inputClass}>
                {GRADE_SCALES.map((g) => (
                  <option key={g} value={g}>
                    {t("outOf", { max: g })}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="maxAttempts" label={t("maxAttempts")} error={errors.maxAttempts} hint={t("maxAttemptsHint")}>
              <input type="number" min={1} max={20} defaultValue={form.value("maxAttempts", test?.max_attempts)} className={inputClass} />
            </Field>
            <Field name="timeLimit" label={t("timeLimit")} error={errors.timeLimit} hint={t("timeLimitHint")}>
              <input type="number" min={1} max={240} defaultValue={form.value("timeLimit", test?.time_limit_minutes)} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}>{t("dynamic")}</legend>
          <p className="mb-3 text-sm text-text-muted">{t("dynamicHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="perAttempt" label={t("perAttempt")} error={errors.perAttempt} hint={t("perAttemptHint")}>
              <input type="number" min={1} max={100} defaultValue={form.value("perAttempt", test?.questions_per_attempt)} className={inputClass} />
            </Field>
            <div className="self-end">
              <Checkbox name="shuffleQuestions" label={t("shuffleQuestions")} defaultChecked={form.checked("shuffleQuestions", test?.shuffle_questions ?? false)} />
              <Checkbox name="shuffleOptions" label={t("shuffleOptions")} defaultChecked={form.checked("shuffleOptions", test?.shuffle_options ?? false)} />
            </div>
          </div>
        </fieldset>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{test ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
