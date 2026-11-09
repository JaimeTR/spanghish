"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LessonBlock } from "@spanglish/content";
import { BilingualField } from "@/components/forms/BilingualField";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { FileUpload } from "@/components/content/FileUpload";
import type { BlockField } from "@/lib/schemas/content";
import { saveBlock } from "./block-actions";

export function BlockForm({ lessonId, locale, kind, block }: { lessonId: string; locale: string; kind: "text" | "image" | "video" | "quiz"; block?: LessonBlock }) {
  const t = useTranslations("content.blocks"); const form = useFormAction<BlockField>(saveBlock);
  const imageBlock = block?.kind === "image" ? block : null;
  const quiz = block?.kind === "quiz" ? block : null;
  const [image, setImage] = useState({ path: imageBlock?.imagePath ?? "", width: imageBlock?.imageWidth ?? 0, height: imageBlock?.imageHeight ?? 0 });
  const [optionsEs, setOptionsEs] = useState(quiz?.optionsEs.join("\n") ?? ""); const [optionsEn, setOptionsEn] = useState(quiz?.optionsEn.join("\n") ?? "");
  return <form action={form.formAction} className="grid gap-4 rounded-md border border-line p-4"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="lessonId" value={lessonId} /><input type="hidden" name="kind" value={kind} />{block ? <input type="hidden" name="id" value={block.id} /> : null}
    <div key={form.formKey} className="grid gap-4">
      {kind === "text" ? <BilingualField name="body" label={t("body")} hint={t("textHelp")} errors={form.fieldErrors} multiline maxLength={5000} defaultValues={{ es: form.value("bodyEs", block?.kind === "text" ? block.bodyEs : ""), en: form.value("bodyEn", block?.kind === "text" ? block.bodyEn : "") }} /> : null}
      {kind === "video" ? <Field name="video" label={t("video")} error={form.fieldErrors.video}><input defaultValue={form.value("video", block?.kind === "video" ? `https://youtu.be/${block.youtubeId}` : "")} className="w-full rounded border border-line p-2" /></Field> : null}
      {kind === "image" ? <><input type="hidden" name="imagePath" value={image.path} /><input type="hidden" name="imageWidth" value={image.width || ""} /><input type="hidden" name="imageHeight" value={image.height || ""} /><FileUpload ownerId={lessonId} target="lessonImage" accept="image/png,image/jpeg,image/webp" maxBytes={2_097_152} locale={locale} currentLabel={image.path} onUploaded={(path, width, height) => setImage({ path, width: width ?? 0, height: height ?? 0 })} /><BilingualField name="alt" label={t("alt")} errors={form.fieldErrors} maxLength={200} defaultValues={{ es: form.value("altEs", imageBlock?.altEs), en: form.value("altEn", imageBlock?.altEn) }} /></> : null}
      {kind === "quiz" ? <><BilingualField name="body" label={t("quiz")} errors={form.fieldErrors} maxLength={1000} defaultValues={{ es: form.value("bodyEs", quiz?.bodyEs), en: form.value("bodyEn", quiz?.bodyEn) }} /><Field name="optionsEs" label={`${t("options")} · ${t("languageEs")}`} error={form.fieldErrors.optionsEs}><textarea value={optionsEs} onChange={(event) => setOptionsEs(event.currentTarget.value)} className="w-full rounded border border-line p-2" /></Field><Field name="optionsEn" label={`${t("options")} · ${t("languageEn")}`} error={form.fieldErrors.optionsEn}><textarea value={optionsEn} onChange={(event) => setOptionsEn(event.currentTarget.value)} className="w-full rounded border border-line p-2" /></Field><Field name="correctOption" label={t("correct")} error={form.fieldErrors.correctOption}><input type="number" min="0" max="3" defaultValue={form.value("correctOption", quiz?.correctOption ?? 0)} className="w-full rounded border border-line p-2" /></Field><BilingualField name="explanation" label={t("explanation")} errors={form.fieldErrors} multiline maxLength={1000} defaultValues={{ es: form.value("explanationEs", quiz?.explanationEs), en: form.value("explanationEn", quiz?.explanationEn) }} /></> : null}
      <FormStatus state={form.state} /><SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </div>
  </form>;
}
