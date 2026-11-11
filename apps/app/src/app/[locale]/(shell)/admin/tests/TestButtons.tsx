"use client";

import { EyeOff, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { IconSubmit } from "@/components/ui/IconButton";
import { deleteQuestion, deleteTest, setTestPublished } from "./actions";

/** Publicar / despublicar solo con icono (para la tabla). */
export function TestPublishIcon({ id, locale, published }: { id: string; locale: string; published: boolean }) {
  const t = useTranslations("tests");
  const form = useFormAction(setTestPublished);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publish" value={published ? "false" : "true"} />
      <IconSubmit
        tone={published ? "neutral" : "primary"}
        label={published ? t("unpublish") : t("publish")}
        icon={published ? <EyeOff className="size-5" strokeWidth={1.75} /> : <Globe className="size-5" strokeWidth={1.75} />}
      />
      <FormStatus state={form.state} />
    </form>
  );
}

/** Botón de texto para la ficha del test. */
export function TestPublishButton({ id, locale, published }: { id: string; locale: string; published: boolean }) {
  const t = useTranslations("tests");
  const form = useFormAction(setTestPublished);
  return (
    <form action={form.formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publish" value={published ? "false" : "true"} />
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
      >
        {published ? t("unpublish") : t("publish")}
      </button>
      <FormStatus state={form.state} />
    </form>
  );
}

export function TestDelete({ id, locale, className = "" }: { id: string; locale: string; className?: string }) {
  const t = useTranslations("tests");
  const ts = useTranslations("shell");
  const form = useFormAction(deleteTest);
  return (
    <form action={form.formAction} className={className}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}

export function QuestionDelete({ id, testId, locale }: { id: string; testId: string; locale: string }) {
  const t = useTranslations("tests.question");
  const ts = useTranslations("shell");
  const form = useFormAction(deleteQuestion);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="testId" value={testId} />
      <ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}
