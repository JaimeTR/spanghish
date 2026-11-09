import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, buttonLinkClass } from "@/components/admin/PageHeader";
import { MoveButtons } from "@/components/content/MoveButtons";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveTeacherProfile } from "./actions";
import { TeacherProfilePublishButton } from "./TeacherProfilePublishButton";
export default async function TeacherProfilesPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale,"admin");
 const [t, db] = await Promise.all([getTranslations({locale,namespace:"teacherProfiles"}),createClient()]);
 const { data } = await db.from("teacher_profiles").select("id,slug,name,status,photo_path,sort_order").order("sort_order").order("id"); const rows=data??[];
 return <><PageHeader title={t("title")} intro={t("intro")} action={<Link className={buttonLinkClass} href={`/${locale}/admin/teachers/profiles/new`}>{t("new")}</Link>}/>
 {rows.length ? <ul className="mt-6 divide-y divide-line">{rows.map((row,index)=><li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{row.photo_path ? <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content-media/${row.photo_path}`} alt="" className="size-12 rounded-full object-cover"/> : <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-surface font-bold">{row.name.slice(0,1)}</span>}<div><Link className="font-semibold underline" href={`/${locale}/admin/teachers/profiles/${row.id}`}>{row.name}</Link><p>{t(row.status === "published" ? "published" : "draft")}</p></div></div><div className="flex flex-wrap items-center gap-2"><MoveButtons id={row.id} action={moveTeacherProfile} first={index===0} last={index===rows.length-1} locale={locale} labelUp={t("moveUp",{name:row.name})} labelDown={t("moveDown",{name:row.name})}/><TeacherProfilePublishButton id={row.id} locale={locale} published={row.status==="published"}/><Link className="min-h-11 rounded border border-line px-3 py-2" href={`/${locale}/admin/teachers/profiles/${row.id}`}>{t("edit")}</Link></div></li>)}</ul>:<p className="mt-6">{t("empty")}</p>}</>;
}
