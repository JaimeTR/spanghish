import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, StatusBadge } from "@/components/admin/PageHeader";
import { MoveButtons } from "@/components/content/MoveButtons";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveTeacherProfile } from "./actions";
import { TeacherProfileDeleteButton } from "./TeacherProfileDeleteButton";
import { TeacherProfileForm } from "./TeacherProfileForm";
import { TeacherProfilePublishButton } from "./TeacherProfilePublishButton";
export default async function TeacherProfilesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
 const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale,"admin");
 const query = await searchParams;
 const [t, db] = await Promise.all([getTranslations({locale,namespace:"teacherProfiles"}),createClient()]);
 const [{ data }, teachers] = await Promise.all([
  db.from("teacher_profiles").select("id,slug,name,status,photo_path,sort_order").order("sort_order").order("id"),
  listTeachers(db),
 ]); const rows=data??[];
 return <><PageHeader title={t("title")} intro={t("intro")} back={{ href: `/${locale}/admin/teachers`, label: t("back") }} action={<ModalButton label={t("new")} size="xl" defaultOpen={query.new === "1"}><TeacherProfileForm locale={locale} teachers={teachers.filter(p=>p.status==="active").map(p=>({id:p.id,name:p.fullName??p.email??p.id}))}/></ModalButton>}/>
 {rows.length ? <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface px-4">{rows.map((row,index)=><li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{row.photo_path ? <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content-media/${row.photo_path}`} alt="" className="size-12 rounded-full object-cover"/> : <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-brand-yellow/50 font-bold">{row.name.slice(0,1)}</span>}<div><Link className="font-semibold underline" href={`/${locale}/admin/teachers/profiles/${row.id}`}>{row.name}</Link><p className="mt-0.5"><StatusBadge tone={row.status === "published" ? "success" : "muted"}>{t(row.status === "published" ? "published" : "draft")}</StatusBadge></p></div></div><div className="flex flex-wrap items-center gap-0.5"><MoveButtons id={row.id} action={moveTeacherProfile} first={index===0} last={index===rows.length-1} locale={locale} labelUp={t("moveUp",{name:row.name})} labelDown={t("moveDown",{name:row.name})}/><TeacherProfilePublishButton id={row.id} locale={locale} published={row.status==="published"}/><IconLink href={`/${locale}/admin/teachers/profiles/${row.id}`} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} /><TeacherProfileDeleteButton id={row.id} locale={locale} className="" /></div></li>)}</ul>:<p className="mt-6">{t("empty")}</p>}</>;
}
