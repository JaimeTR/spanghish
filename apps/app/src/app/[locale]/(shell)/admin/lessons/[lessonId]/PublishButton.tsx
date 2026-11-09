"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { setLessonPublished } from "../actions";
export function PublishButton({ locale, id, published }: { locale: string; id: string; published: boolean }) {
  const t = useTranslations("content.lessons"); const form = useFormAction(setLessonPublished);
  return <form action={form.formAction} className="mt-4"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={id} /><input type="hidden" name="publish" value={published ? "false" : "true"} /><button type="submit" className="min-h-11 rounded bg-primary px-4 text-on-primary">{published ? t("unpublish") : t("publish")}</button><FormStatus state={form.state} /></form>;
}
