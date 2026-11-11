"use client";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { adoptAccountPhoto } from "./actions";

/** Copia la foto de perfil de la cuenta a la ficha pública (la ficha conserva su propia copia). */
export function AdoptAccountPhotoButton({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("teacherProfiles");
  const router = useRouter();
  const form = useFormAction(adoptAccountPhoto, { status: "idle" }, true);
  useEffect(() => {
    if (form.state.status === "ok") router.refresh();
  }, [form.state, router]);
  return (
    <form action={form.formAction} className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton pendingLabel={t("copying")} variant="secondary"><Camera aria-hidden="true" className="mr-2 inline size-4" />{t("useAccountPhoto")}</SubmitButton>
      <FormStatus state={form.state} />
    </form>
  );
}
