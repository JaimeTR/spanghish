import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { TeacherProfileForm } from "../TeacherProfileForm";
import { TeacherProfileDeleteButton } from "../TeacherProfileDeleteButton";
export default async function EditTeacherProfilePage({params}:{params:Promise<{locale:string;profileId:string}>}) { const {locale,profileId}=await params; if(!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale,"admin"); if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) notFound(); const db=await createClient(); const [t,result,people]=await Promise.all([getTranslations({locale,namespace:"teacherProfiles"}),db.from("teacher_profiles").select("*").eq("id",profileId).maybeSingle(),listTeachers(db)]); if(!result.data) notFound(); return <><PageHeader title={result.data.name} back={{href:`/${locale}/admin/teachers`,label:t("back")}}/><TeacherProfileForm locale={locale} profile={result.data} teachers={people.filter(p=>p.status==="active").map(p=>({id:p.id,name:p.fullName??p.email??p.id}))}/><TeacherProfileDeleteButton id={profileId} locale={locale}/></>; }
