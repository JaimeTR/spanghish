import { Bell } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { onLightFocus } from "@/components/shell-styles";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/** Campana de la barra superior: lleva a los avisos y muestra cuántos hay sin leer. */
export async function NotificationBell({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "notifications" });
  const { count } = await (await createClient())
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const unread = count ?? 0;
  return (
    <Link
      href={`/${locale}/account/notifications`}
      aria-label={unread > 0 ? t("bellUnread", { count: unread }) : t("bell")}
      className={`relative inline-flex size-11 items-center justify-center rounded-full text-structure hover:bg-surface-sunken ${onLightFocus}`}
    >
      <Bell aria-hidden="true" className="size-5" strokeWidth={1.75} />
      {unread > 0 ? (
        <span aria-hidden="true" className="absolute top-1 right-1 min-w-5 rounded-full bg-primary px-1 text-center text-xs leading-5 font-bold text-on-primary">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
