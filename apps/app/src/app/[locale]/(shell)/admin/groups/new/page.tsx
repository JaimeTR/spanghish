import { redirect } from "next/navigation";

/** El alta vive en un modal de la lista; esta dirección se conserva y lo abre. */
export default async function NewGroupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/groups?new=1`);
}
