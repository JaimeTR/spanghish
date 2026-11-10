"use client";
import { EyeOff, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { IconSubmit } from "@/components/ui/IconButton";
import { setResourcePublished } from "./actions";
export function ResourcePublishButton({ id, locale, published }: { id: string; locale: string; published: boolean }) {
  const t = useTranslations("content.resources"); const form = useFormAction(setResourcePublished);
  return <form action={form.formAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={id} /><input type="hidden" name="publish" value={published ? "false" : "true"} /><IconSubmit tone={published ? "neutral" : "primary"} label={published ? t("unpublish") : t("publish")} icon={published ? <EyeOff className="size-5" strokeWidth={1.75} /> : <Globe className="size-5" strokeWidth={1.75} />} /><FormStatus state={form.state} /></form>;
}
