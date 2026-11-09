"use client";
import { useTranslations } from "next-intl";
import type { Tables } from "@spanglish/db";
import { useFormAction } from "@/components/forms/useFormAction";
import { Field } from "@/components/forms/Field";
import { Checkbox } from "@/components/forms/Checkbox";
import { BilingualField } from "@/components/forms/BilingualField";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { TeacherProfileField } from "@/lib/schemas/content";
import { saveTeacherProfile } from "./actions";
import { FileUpload } from "@/components/content/FileUpload";

export function TeacherProfileForm({ locale, profile, teachers }: { locale: string; profile?: Tables<"teacher_profiles">; teachers: { id: string; name: string }[] }) {
  const t = useTranslations("teacherProfiles"); const f = useFormAction<TeacherProfileField>(saveTeacherProfile, undefined, true);
  const bilingual = (name: string, maxLength: number, multiline = false) => <BilingualField name={name} label={t(`fields.${name}`)} maxLength={maxLength} multiline={multiline} errors={f.fieldErrors} defaultValues={{ es: f.value(`${name}Es` as TeacherProfileField, profile?.[`${name}_es` as keyof typeof profile] as string ?? ""), en: f.value(`${name}En` as TeacherProfileField, profile?.[`${name}_en` as keyof typeof profile] as string ?? "") }} />;
  return <form action={f.formAction} className="mt-8 grid max-w-3xl gap-5"><input type="hidden" name="locale" value={locale}/>{profile && <input type="hidden" name="id" value={profile.id}/>}
    <div key={f.formKey} className="grid gap-5">
      {!profile ? <Field name="slug" label={t("fields.slug")} error={f.fieldErrors.slug}><input className="w-full rounded border border-line bg-surface px-3 py-2" defaultValue={f.value("slug")} /></Field> : <p>{t("fields.slug")}: <strong>{profile.slug}</strong><input type="hidden" name="slug" value={profile.slug}/></p>}
      <Field name="name" label={t("fields.name")} error={f.fieldErrors.name}><input maxLength={80} className="w-full rounded border border-line bg-surface px-3 py-2" defaultValue={f.value("name", profile?.name)}/></Field>
      <Field name="photoPosition" label={t("fields.photoPosition")} error={f.fieldErrors.photoPosition}><input name="photoPosition" defaultValue={f.value("photoPosition", profile?.photo_position ?? "50% 30%")} className="w-full rounded border border-line bg-surface px-3 py-2"/></Field>
      {bilingual("photoAlt",160)}{bilingual("role",120)}{bilingual("tagline",200)}{bilingual("metaDescription",300,true)}{bilingual("intro",300,true)}{bilingual("body",3000,true)}{bilingual("specialty",1500,true)}{bilingual("enrolTitle",80)}{bilingual("enrol",1500,true)}
      <BilingualField name="facts" label={t("fields.facts")} maxLength={965} multiline errors={f.fieldErrors} defaultValues={{ es: f.value("factsEs", profile?.facts_es.join("\n") ?? ""), en: f.value("factsEn", profile?.facts_en.join("\n") ?? "") }}/>
      <Checkbox name="showApproach" label={t("fields.showApproach")} defaultChecked={f.checked("showApproach", profile?.show_approach ?? false)}/>
      <Field name="profileId" label={t("fields.profileId")}><select name="profileId" defaultValue={f.value("profileId", profile?.profile_id ?? "")} className="w-full rounded border border-line bg-surface px-3 py-2"><option value="">—</option>{teachers.map((teacher)=><option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field>
      {profile ? <FileUpload ownerId={profile.id} target="teacherPhoto" locale={locale} accessibleLabel={t("choosePhoto")} accept="image/png,image/jpeg,image/webp" maxBytes={2_097_152} currentLabel={profile.photo_path ?? undefined}/> : null}
      <FormStatus state={f.state}/><SubmitButton pendingLabel={t("saving")}>{profile ? t("save") : t("create")}</SubmitButton>
    </div></form>;
}
