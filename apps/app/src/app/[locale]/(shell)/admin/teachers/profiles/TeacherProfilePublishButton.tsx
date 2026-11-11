"use client";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { IconSubmit } from "@/components/ui/IconButton";
import { setTeacherProfilePublished } from "./actions";

/** Ojo: abierto = visible en la web (pulsa para ocultarla); tachado = oculta (pulsa para mostrarla). */
export function TeacherProfilePublishButton({ id, locale, published }: { id: string; locale: string; published: boolean }) {
  const t = useTranslations("teacherProfiles");
  const form = useFormAction(setTeacherProfilePublished);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="publish" value={published ? "false" : "true"} />
      <IconSubmit
        tone={published ? "neutral" : "primary"}
        label={published ? t("hideFromWeb") : t("showOnWeb")}
        icon={published ? <Eye className="size-5" strokeWidth={1.75} /> : <EyeOff className="size-5" strokeWidth={1.75} />}
      />
      <FormStatus state={form.state} />
    </form>
  );
}
