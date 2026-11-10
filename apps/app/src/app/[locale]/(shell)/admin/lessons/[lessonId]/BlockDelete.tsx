"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { deleteBlock } from "./block-actions";
export function BlockDelete({ locale, lessonId, blockId }: { locale: string; lessonId: string; blockId: string }) {
  const t = useTranslations("content.blocks"); const form = useFormAction(deleteBlock);
  return <form action={form.formAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="lessonId" value={lessonId} /><input type="hidden" name="id" value={blockId} /><ConfirmDelete label={t("delete")} confirmLabel={t("confirm")} cancelLabel={t("cancel")} /><FormStatus state={form.state} /></form>;
}
