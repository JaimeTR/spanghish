"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { deleteAssignment, gradeSubmission, saveAssignment, type AssignmentField, type GradeField } from "@/lib/assignments/actions";

export type AssignmentValues = {
  id: string;
  group_id: string;
  title: string;
  instructions: string | null;
  /** "2026-11-20T18:00" en hora escolar, o null. */
  dueLocal: string | null;
  max_grade: number;
  status: string;
};

/** Crear o editar una tarea de uno de mis grupos. `dueLocal` ya viene en hora escolar (Brisbane). */
export function AssignmentForm({ locale, groups, assignment }: { locale: string; groups: { id: string; name: string }[]; assignment?: AssignmentValues }) {
  const t = useTranslations("assignments.teacher.form");
  const form = useFormAction<AssignmentField>(saveAssignment, { status: "idle" }, Boolean(assignment));
  const errors = form.fieldErrors;
  const prefix = `assignment-${assignment?.id ?? "new"}-`;
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      {assignment ? <input type="hidden" name="id" value={assignment.id} /> : null}
      <div key={form.formKey} className="space-y-4">
        <Field idPrefix={prefix} name="groupId" label={t("group")} error={errors.groupId}>
          <select defaultValue={form.value("groupId", assignment?.group_id) ?? ""} className={inputClass}>
            <option value="">{t("choose")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field idPrefix={prefix} name="title" label={t("title")} error={errors.title}>
          <input type="text" maxLength={120} defaultValue={form.value("title", assignment?.title)} className={inputClass} />
        </Field>
        <Field idPrefix={prefix} name="instructions" label={t("instructions")} error={errors.instructions}>
          <textarea rows={5} maxLength={4000} defaultValue={form.value("instructions", assignment?.instructions)} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field idPrefix={prefix} name="dueAt" label={t("dueAt")} hint={t("dueAtHint")} error={errors.dueAt}>
            <input type="datetime-local" defaultValue={form.value("dueAt", assignment?.dueLocal)} className={inputClass} />
          </Field>
          <Field idPrefix={prefix} name="maxGrade" label={t("maxGrade")} error={errors.maxGrade}>
            <select defaultValue={form.value("maxGrade", assignment?.max_grade ?? 10)} className={inputClass}>
              {[10, 20, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix={prefix} name="status" label={t("status")} hint={t("statusHint")} error={errors.status}>
            <select defaultValue={form.value("status", assignment?.status ?? "published")} className={inputClass}>
              <option value="published">{t("published")}</option>
              <option value="draft">{t("draft")}</option>
            </select>
          </Field>
        </div>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{assignment ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}

export function AssignmentDelete({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("assignments.teacher");
  const ts = useTranslations("shell");
  const form = useFormAction(deleteAssignment);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Nota y comentario de una entrega. Sin nota, la entrega vuelve a "sin calificar". */
export function GradeForm({ locale, id, maxGrade, grade, feedback }: { locale: string; id: string; maxGrade: number; grade: number | null; feedback: string | null }) {
  const t = useTranslations("assignments.teacher.grade");
  const form = useFormAction<GradeField>(gradeSubmission, { status: "idle" }, true);
  return (
    <form action={form.formAction} noValidate className="mt-3 space-y-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <div key={form.formKey} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field idPrefix={`grade-${id}-`} name="grade" label={t("grade", { max: maxGrade })} error={form.fieldErrors.grade}>
          <input type="text" inputMode="decimal" defaultValue={form.value("grade", grade === null ? "" : String(grade).replace(".", ","))} className={inputClass} />
        </Field>
        <Field idPrefix={`grade-${id}-`} name="feedback" label={t("feedback")} error={form.fieldErrors.feedback}>
          <input type="text" maxLength={2000} defaultValue={form.value("feedback", feedback)} className={inputClass} />
        </Field>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
