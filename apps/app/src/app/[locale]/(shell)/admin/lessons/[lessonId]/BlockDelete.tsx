"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { deleteBlock } from "./block-actions";
export function BlockDelete({ locale, lessonId, blockId }: { locale: string; lessonId: string; blockId: string }) {
  const [confirm, setConfirm] = useState(false); const t = useTranslations("content.blocks"); const form = useFormAction(deleteBlock);
  return <form action={form.formAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="lessonId" value={lessonId} /><input type="hidden" name="id" value={blockId} />{confirm ? <><button type="submit" className="min-h-11 rounded bg-danger px-3 text-white">{t("confirm")}</button><button type="button" onClick={() => setConfirm(false)} className="min-h-11 px-3 underline">{t("cancel")}</button></> : <button type="button" onClick={() => setConfirm(true)} className="min-h-11 px-3 underline">{t("delete")}</button>}<FormStatus state={form.state} /></form>;
}
