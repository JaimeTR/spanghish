"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { deleteTeacherProfile } from "./actions";
export function TeacherProfileDeleteButton({ id, locale }: { id: string; locale: string }) { const t = useTranslations("teacherProfiles"); const form = useFormAction(deleteTeacherProfile); return <form action={form.formAction}><input type="hidden" name="id" value={id}/><input type="hidden" name="locale" value={locale}/><button className="mt-8 min-h-11 underline text-danger" type="submit">{t("delete")}</button><FormStatus state={form.state}/></form>; }
