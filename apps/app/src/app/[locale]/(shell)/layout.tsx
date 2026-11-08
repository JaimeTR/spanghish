import { Button } from "@spanglish/ui";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { logout } from "@/lib/auth-actions";
import { getSessionUser } from "@/lib/session";

// Envoltorio mínimo de las zonas privadas; la Tarea 9 lo sustituye por el shell real.
export default async function ShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user || user.roles.length === 0) redirect(`/${locale}/login`);
  const t = await getTranslations({ locale, namespace: "shell" });

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between bg-structure px-4 py-3 text-on-structure">
        <span className="font-bold">Spanglish</span>
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="highlight">
            {t("logout")}
          </Button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
