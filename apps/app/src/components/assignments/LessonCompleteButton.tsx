"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { useFormAction } from "@/components/forms/useFormAction";
import { setLessonCompleted } from "@/lib/assignments/actions";

/** "Marcar como completada" / "Completada ✓" al final de una lección (progreso del alumno). */
export function LessonCompleteButton({ locale, studentId, lessonId, done }: { locale: string; studentId: string; lessonId: string; done: boolean }) {
  const t = useTranslations("progress.lesson");
  const form = useFormAction(setLessonCompleted);
  return (
    <form action={form.formAction} className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      <button
        type="submit"
        aria-pressed={done}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md px-5 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${
          done ? "bg-success/12 text-success ring-2 ring-success" : "bg-primary text-on-primary hover:bg-primary-hover"
        }`}
      >
        {done ? <Check aria-hidden="true" className="size-5" strokeWidth={2.25} /> : null}
        {done ? t("done") : t("mark")}
      </button>
      <FormStatus state={form.state} />
    </form>
  );
}
