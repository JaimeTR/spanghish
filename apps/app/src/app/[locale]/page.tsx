import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { roleHomePath } from "@/lib/access";
import { getSessionUser } from "@/lib/session";

/** /<locale>: con sesión, a la zona de su rol principal; si no, al login. */
export default async function LocaleRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getSessionUser();
  redirect(user && user.roles.length > 0 ? roleHomePath(user.roles, locale) : `/${locale}/login`);
}
