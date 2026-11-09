"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { deleteResource } from "./actions";
export function ResourceDeleteButton({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("content.resources"); const form = useFormAction(deleteResource);
  return <form action={form.formAction} className="mt-8"><input type="hidden" name="id" value={id} /><input type="hidden" name="locale" value={locale} /><button className="min-h-11 text-danger underline" type="submit">{t("delete")}</button><FormStatus state={form.state} /></form>;
}
