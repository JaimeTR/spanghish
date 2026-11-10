import { redirect } from "next/navigation";

/** La invitación vive en un modal de la lista; esta dirección se conserva y lo abre. */
export default async function NewTeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/teachers?new=1`);
}
