import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { TeacherProfileForm } from "../TeacherProfileForm";
export default async function NewTeacherProfilePage({params}:{params:Promise<{locale:string}>}) { const {locale}=await params; if(!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale,"admin"); const [t,db]=await Promise.all([getTranslations({locale,namespace:"teacherProfiles"}),createClient()]); const {data}=await db.from("profiles").select("id,full_name").eq("status","active").contains("roles",["teacher"]).order("full_name"); return <><PageHeader title={t("new")} back={{href:`/${locale}/admin/teachers/profiles`,label:t("back")}}/><TeacherProfileForm locale={locale} teachers={(data??[]).map(p=>({id:p.id,name:p.full_name??p.id}))}/></>; }
