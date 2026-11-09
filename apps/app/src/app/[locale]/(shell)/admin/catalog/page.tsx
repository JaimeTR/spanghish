import { ClipboardList, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLocations, listPrograms } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const cardClass =
  "flex min-h-11 items-start gap-4 rounded-md border border-line bg-surface p-5 hover:bg-surface-sunken " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple";

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog" });
  const supabase = await createClient();
  const [locations, programs] = await Promise.all([listLocations(supabase), listPrograms(supabase)]);

  const cards = [
    {
      href: `/${locale}/admin/catalog/programs`,
      icon: ClipboardList,
      title: t("programs.title"),
      text: t("summary.programs", { count: programs.filter((p) => p.active).length }),
    },
    {
      href: `/${locale}/admin/catalog/locations`,
      icon: MapPin,
      title: t("locations.title"),
      text: t("summary.locations", { count: locations.filter((l) => l.active).length }),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className={cardClass}>
              <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-structure" strokeWidth={1.75} />
              <span>
                <span className="block text-lg font-semibold text-text">{title}</span>
                <span className="block text-text-muted">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
