"use client";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/components/forms/useFormAction";
import { Field } from "@/components/forms/Field";
import { Checkbox } from "@/components/forms/Checkbox";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { BilingualField } from "@/components/forms/BilingualField";
import type { Tables } from "@spanglish/db";
import type { ResourceField } from "@/lib/schemas/content";
import { saveResource } from "./actions";

export function ResourceForm({ locale, resource, levels }: { locale: string; resource?: Tables<"resources">; levels: { id: string; code: string }[] }) {
  const t = useTranslations("content.resources");
  const form = useFormAction<ResourceField>(saveResource, undefined, true);
  return <form action={form.formAction} className="mt-8 grid max-w-3xl gap-5">
    <input type="hidden" name="locale" value={locale} />{resource ? <input type="hidden" name="id" value={resource.id} /> : null}
    <div key={form.formKey} className="grid gap-5">
      <Field name="kind" label={t("kind")} error={form.fieldErrors.kind}><select defaultValue={form.value("kind", resource?.kind ?? "video")} className="w-full rounded border border-line bg-surface px-3 py-2">{["video", "document", "link", "worksheet", "vocabulary", "recording", "coursework"].map((kind) => <option key={kind} value={kind}>{t(`kindNames.${kind}`)}</option>)}</select></Field>
      <Field name="accessLevel" label={t("access")} error={form.fieldErrors.accessLevel}><select defaultValue={form.value("accessLevel", resource?.access_level ?? "public")} className="w-full rounded border border-line bg-surface px-3 py-2">{["public", "account", "enrolled"].map((level) => <option key={level} value={level}>{t(`levelNames.${level}`)}</option>)}</select></Field>
      <BilingualField name="title" label={t("titleLabel")} maxLength={120} errors={form.fieldErrors} defaultValues={{ es: form.value("titleEs", resource?.title_es), en: form.value("titleEn", resource?.title_en) }} />
      <BilingualField name="description" label={t("description")} maxLength={500} multiline errors={form.fieldErrors} defaultValues={{ es: form.value("descriptionEs", resource?.description_es), en: form.value("descriptionEn", resource?.description_en) }} />
      <Field name="titleLang" label={t("titleLang")}><select defaultValue={form.value("titleLang", resource?.title_lang ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2"><option value="">—</option><option value="es">{t("langEs")}</option><option value="en">{t("langEn")}</option></select></Field>
      <Field name="video" label={t("video")} error={form.fieldErrors.video}><input type="url" defaultValue={form.value("video", resource?.youtube_id ? `https://youtu.be/${resource.youtube_id}` : "")} className="w-full rounded border border-line bg-surface px-3 py-2" /></Field>
      <Field name="externalUrl" label={t("externalUrl")} error={form.fieldErrors.externalUrl}><input type="url" defaultValue={form.value("externalUrl", resource?.external_url ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2" /></Field>
      <Field name="levelId" label={t("level")}><select defaultValue={form.value("levelId", resource?.level_id ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2"><option value="">—</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.code}</option>)}</select></Field>
      <Field name="audience" label={t("audience")}><select defaultValue={form.value("audience", resource?.audience ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2"><option value="">—</option>{["kids", "adults", "mature"].map((v) => <option key={v} value={v}>{t(`audiences.${v}`)}</option>)}</select></Field>
      <Checkbox name="teaserPublic" label={t("teaser")} defaultChecked={form.checked("teaserPublic", resource?.teaser_public ?? true)} />
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{resource ? t("save") : t("create")}</SubmitButton>
    </div>
  </form>;
}
