"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { navItemsFor, navUrl } from "@/lib/nav";
import { NAV_ICONS } from "./nav-icons";
import { onStructureFocus } from "./shell-styles";

const itemBase =
  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[0.9375rem] leading-tight";

/**
 * Navegación del área. Pensada para fondo morado (estructura): en escritorio va
 * en la barra lateral y en móvil dentro del menú desplegable (MobileMenu).
 * Todos los módulos son enlaces; los que aún no existen llevan la insignia
 * "En desarrollo" (texto visible y en el nombre accesible) y abren su página
 * explicativa.
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
  const items = navItemsFor(role).map((item) => ({ ...item, url: navUrl(item, locale) }));
  // El enlace activo es el más específico que coincide con la ruta actual.
  const active = items
    .filter(({ url }) => pathname === url || pathname.startsWith(`${url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0]?.url;

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-1">
        {items.map(({ key, icon, url, status }) => {
          const Icon = NAV_ICONS[icon];
          const label = t(`items.${key}`);
          const inDev = status === "dev";
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
                <span className="flex-1">{label}</span>
                {/* Nombre accesible = texto visible: "Calendario, En desarrollo". */}
                {inDev && <span className="sr-only">, </span>}
                {inDev && (
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap ${
                      current ? "bg-structure text-on-structure" : "bg-brand-yellow text-text"
                    }`}
                  >
                    {t("status.dev")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
