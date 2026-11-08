"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { navItemsFor } from "@/lib/nav";
import { NAV_ICONS } from "./nav-icons";
import { onStructureFocus } from "./shell-styles";

const itemBase =
  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[0.9375rem] leading-tight";

/**
 * Navegación del área. Pensada para fondo morado (estructura): en escritorio va
 * en la barra lateral y en móvil dentro del menú desplegable.
 * Los elementos "Pronto" no son enlaces: no existe aún su ruta.
 */
export function Sidebar({
  role,
  locale,
  onNavigate,
}: {
  role: AppRole;
  locale: Locale;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = navItemsFor(role).map((item) => ({ ...item, url: item.href?.(locale) ?? null }));
  // El enlace activo es el más específico que coincide con la ruta actual.
  const active = items
    .filter(({ url }) => url && (pathname === url || pathname.startsWith(`${url}/`)))
    .sort((a, b) => b.url!.length - a.url!.length)[0]?.url;

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-1">
        {items.map(({ key, icon, url }) => {
          const Icon = NAV_ICONS[icon];
          const label = t(`items.${key}`);
          if (!url) {
            return (
              <li key={key}>
                <span
                  role="link"
                  aria-disabled="true"
                  className={`${itemBase} cursor-default text-on-structure/80`}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-sm bg-on-structure/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-on-structure uppercase">
                    {t("soon")}
                  </span>
                </span>
              </li>
            );
          }
          const current = url === active;
          return (
            <li key={key}>
              <Link
                href={url}
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={`${itemBase} ${onStructureFocus} transition-colors duration-150 ${
                  current
                    ? "bg-highlight font-semibold text-on-highlight"
                    : "text-on-structure hover:bg-on-structure/10"
                }`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={current ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
