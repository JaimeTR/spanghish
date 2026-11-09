"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { setTeacherProfilePublished } from "./actions";
export function TeacherProfilePublishButton({ id, locale, published }: { id: string; locale: string; published: boolean }) {
  const t = useTranslations("teacherProfiles"); const form = useFormAction(setTeacherProfilePublished);
  return <form action={form.formAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={id}/><input type="hidden" name="locale" value={locale}/><input type="hidden" name="publish" value={published ? "false" : "true"}/><button className="min-h-11 rounded border border-line px-3" type="submit">{published ? t("unpublish") : t("publish")}</button><FormStatus state={form.state}/></form>;
}
