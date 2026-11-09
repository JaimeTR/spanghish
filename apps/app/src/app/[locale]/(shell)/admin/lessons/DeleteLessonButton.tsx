"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { deleteLesson } from "./actions";
export function DeleteLessonButton({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("content.lessons"); const form = useFormAction(deleteLesson);
  return <form action={form.formAction} className="mt-8"><input type="hidden" name="id" value={id} /><input type="hidden" name="locale" value={locale} /><button type="submit" className="min-h-11 text-danger underline">{t("delete")}</button><FormStatus state={form.state} /></form>;
}
