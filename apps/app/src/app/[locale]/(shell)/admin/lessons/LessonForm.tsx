"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/content/Cover";
import { FileUpload } from "@/components/content/FileUpload";
import type { Tables } from "@spanglish/db";
import { useFormAction } from "@/components/forms/useFormAction";
import { BilingualField } from "@/components/forms/BilingualField";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { LessonField } from "@/lib/schemas/content";
import { saveLesson } from "./actions";

export function LessonForm({ locale, lesson, levels, defaults = {} }: { locale: string; lesson?: Tables<"lessons">; levels: { id: string; code: string }[]; defaults?: { category?: string; levelId?: string } }) {
  const t = useTranslations("content.lessons"); const form = useFormAction<LessonField>(saveLesson); const [cover, setCover] = useState<string | null>(lesson?.cover_path ?? null);
  const fixed = lesson?.kind === "interactive";
  return <form action={form.formAction} className="mt-8 grid max-w-3xl gap-5"><input type="hidden" name="locale" value={locale} />{lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
    <div key={form.formKey} className="grid gap-5">
      {fixed ? <><input type="hidden" name="slug" value={lesson.slug} /><input type="hidden" name="category" value={lesson.category} /><input type="hidden" name="accessLevel" value={lesson.access_level} /><p>{t("slug")}: <code>{lesson.slug}</code></p><p>{t("category")}: {t(`categoryNames.${lesson.category}`)} · {t(`kindNames.${lesson.kind}`)}</p></> : <>
        <Field name="slug" label={t("slug")} error={form.fieldErrors.slug}><input defaultValue={form.value("slug", lesson?.slug)} maxLength={80} className="w-full rounded border border-line bg-surface px-3 py-2" /></Field>
        <Field name="category" label={t("category")} error={form.fieldErrors.category}><select defaultValue={form.value("category", lesson?.category ?? defaults.category ?? "foundations")} className="w-full rounded border border-line bg-surface px-3 py-2">{["foundations", "kids", "adults", "stories", "games"].map((value) => <option key={value} value={value}>{t(`categoryNames.${value}`)}</option>)}</select></Field>
        <Field name="accessLevel" label={t("access")}><select defaultValue={form.value("accessLevel", lesson?.access_level ?? "public")} className="w-full rounded border border-line bg-surface px-3 py-2">{["public", "account", "enrolled"].map((value) => <option key={value} value={value}>{t(`levelAccess.${value}`)}</option>)}</select></Field>
      </>}
      {!fixed ? <Field name="levelId" label={t("level")} error={form.fieldErrors.levelId}><select defaultValue={form.value("levelId", lesson?.level_id ?? defaults.levelId ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2"><option value="">—</option>{levels.map((level) => <option key={level.id} value={level.id}>{level.code}</option>)}</select></Field> : <input type="hidden" name="levelId" value={lesson?.level_id ?? ""} />}
      <BilingualField name="title" label={t("title")} maxLength={120} errors={form.fieldErrors} defaultValues={{ es: form.value("titleEs", lesson?.title_es), en: form.value("titleEn", lesson?.title_en) }} />
      <BilingualField name="summary" label={t("summary")} maxLength={300} multiline errors={form.fieldErrors} defaultValues={{ es: form.value("summaryEs", lesson?.summary_es), en: form.value("summaryEn", lesson?.summary_en) }} />
      {lesson ? <fieldset className="grid gap-3 rounded-md border border-line p-4"><legend className="px-1 font-semibold">{t("cover")}</legend>
        <div className="flex items-start gap-4"><CoverThumb path={cover} size={96} /><div className="min-w-0 flex-1"><p className="mb-2 text-sm text-text-muted">{t("coverHelp")}</p>
          <FileUpload ownerId={lesson.id} target="lessonCover" accept="image/png,image/jpeg,image/webp" maxBytes={2_097_152} locale={locale} currentLabel={cover ? t("coverSet") : undefined} onUploaded={(path) => setCover(path)} accessibleLabel={t("cover")} /></div></div></fieldset>
        : <p className="text-sm text-text-muted">{t("coverAfterCreate")}</p>}
      <Checkbox name="teaserPublic" label={t("teaser")} defaultChecked={form.checked("teaserPublic", lesson?.teaser_public ?? true)} />
      <FormStatus state={form.state} /><SubmitButton pendingLabel={t("saving")}>{lesson ? t("save") : t("create")}</SubmitButton>
    </div>
  </form>;
}
