import { Bell } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { onLightFocus } from "@/components/shell-styles";
import { isLocale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { MarkAllRead } from "./MarkAllRead";

/** Avisos y recordatorios de quien tiene la sesión (RLS: solo los suyos). */
export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user) notFound();
  const t = await getTranslations({ locale, namespace: "notifications" });
  const { data } = await (await createClient())
    .from("notifications")
    .select("id, title_es, title_en, body_es, body_en, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <section aria-labelledby="notifications-title" className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="notifications-title" className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-text-muted">{t("intro")}</p>
        </div>
        {unread > 0 ? <MarkAllRead locale={locale} /> : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-8 flex items-start gap-3 rounded-md bg-surface-sunken px-5 py-6 text-text-muted">
          <Bell aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-structure" strokeWidth={1.75} />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          {items.map((n) => {
            const title = locale === "es" ? n.title_es : n.title_en;
            const body = locale === "es" ? n.body_es : n.body_en;
            const content = (
              <>
                <span className="flex items-center gap-2 font-semibold text-text">
                  {!n.read_at ? (
                    <>
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                      <span className="sr-only">{t("unread")}</span>
                    </>
                  ) : null}
                  {title}
                </span>
                {body ? <span className="mt-0.5 block text-sm text-text-muted">{body}</span> : null}
                <span className="mt-1 block text-xs text-text-muted">{formatInstant(n.created_at, locale)}</span>
              </>
            );
            return (
              <li key={n.id} className={n.read_at ? "" : "bg-surface-sunken"}>
                {n.link ? (
                  <Link href={`/${locale}/${n.link}`} className={`block px-5 py-4 hover:bg-surface-sunken ${onLightFocus}`}>
                    {content}
                  </Link>
                ) : (
                  <div className="px-5 py-4">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
