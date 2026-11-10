"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { deleteResource } from "./actions";
export function ResourceDeleteButton({ id, locale, className = "mt-8" }: { id: string; locale: string; className?: string }) {
  const t = useTranslations("content.resources"); const ts = useTranslations("shell"); const form = useFormAction(deleteResource);
  return <form action={form.formAction} className={className}><input type="hidden" name="id" value={id} /><input type="hidden" name="locale" value={locale} /><ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} /><FormStatus state={form.state} /></form>;
}
