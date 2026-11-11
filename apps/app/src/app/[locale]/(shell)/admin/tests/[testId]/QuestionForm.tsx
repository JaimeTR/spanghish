"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { BilingualField } from "@/components/forms/BilingualField";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { QUESTION_KINDS, type QuestionField, type QuestionKind } from "@/lib/schemas/tests";
import { saveQuestion } from "../actions";

export type QuestionValues = {
  id: string;
  kind: QuestionKind;
  prompt_es: string;
  prompt_en: string;
  options: string[] | null;
  correct_option: number | null;
  correct_bool: boolean | null;
  accepted_answers: string[] | null;
  explanation_es: string | null;
  explanation_en: string | null;
  points: number;
};

/** Pregunta del banco de un test. El tipo (opción única, verdadero/falso, escrita) solo se elige al crearla. */
export function QuestionForm({ locale, testId, question }: { locale: Locale; testId: string; question?: QuestionValues }) {
  const t = useTranslations("tests.question");
  const [kind, setKind] = useState<QuestionKind>(question?.kind ?? "single");
  const form = useFormAction<QuestionField>(saveQuestion, { status: "idle" }, Boolean(question));
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="testId" value={testId} />
      <input type="hidden" name="kind" value={kind} />
      {question ? <input type="hidden" name="id" value={question.id} /> : null}
      {!question ? (
        <div role="radiogroup" aria-label={t("kind")} className="flex flex-wrap gap-2">
          {QUESTION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-11 rounded-md border px-4 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${
                kind === k ? "border-structure bg-structure text-on-structure" : "border-line bg-surface text-text hover:bg-surface-sunken"
              }`}
            >
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-text-muted">{t(`kinds.${kind}`)}</p>
      )}

      <div key={form.formKey} className="space-y-4">
        <BilingualField
          name="prompt"
          label={t("prompt")}
          multiline
          maxLength={600}
          errors={errors}
          defaultValues={{ es: form.value("promptEs", question?.prompt_es), en: form.value("promptEn", question?.prompt_en) }}
        />

        {kind === "single" ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field name="options" label={t("options")} hint={t("optionsHint")} error={errors.options}>
              <textarea rows={5} defaultValue={form.value("options", question?.options?.join("\n"))} className={inputClass} />
            </Field>
            <Field name="correctOption" label={t("correctOption")} error={errors.correctOption}>
              <select defaultValue={form.value("correctOption", question?.correct_option != null ? question.correct_option + 1 : "")} className={inputClass}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {t("optionNumber", { n })}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {kind === "truefalse" ? (
          <Field name="correctBool" label={t("correctBool")} error={errors.correctBool}>
            <select defaultValue={form.value("correctBool", question?.correct_bool == null ? "" : String(question.correct_bool))} className={inputClass}>
              <option value="">—</option>
              <option value="true">{t("true")}</option>
              <option value="false">{t("false")}</option>
            </select>
          </Field>
        ) : null}

        {kind === "fill" ? (
          <Field name="accepted" label={t("accepted")} hint={t("acceptedHint")} error={errors.accepted}>
            <textarea rows={3} defaultValue={form.value("accepted", question?.accepted_answers?.join("\n"))} className={inputClass} />
          </Field>
        ) : null}

        <BilingualField
          name="explanation"
          label={t("explanation")}
          multiline
          maxLength={500}
          errors={errors}
          defaultValues={{ es: form.value("explanationEs", question?.explanation_es), en: form.value("explanationEn", question?.explanation_en) }}
        />
        <div className="max-w-40">
          <Field name="points" label={t("points")} error={errors.points}>
            <input type="number" min={1} max={10} defaultValue={form.value("points", question?.points ?? 1)} className={inputClass} />
          </Field>
        </div>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{question ? t("save") : t("add")}</SubmitButton>
    </form>
  );
}
