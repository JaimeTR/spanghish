"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { navGroupsFor, navUrl } from "@/lib/nav";
import { NAV_ICONS } from "./nav-icons";
import { onStructureFocus } from "./shell-styles";

const itemBase = "relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[0.9375rem] leading-tight";

/**
 * Navegación del área, agrupada por secciones. Pensada para fondo morado
 * (estructura): en escritorio va en la barra lateral (que puede minimizarse a
 * solo iconos con `collapsed`) y en móvil dentro del menú desplegable.
 * Todos los módulos son enlaces; los que aún no existen llevan la insignia
 * "En desarrollo" (texto visible y en el nombre accesible) y abren su página
 * explicativa. Minimizada, la etiqueta queda solo para lectores y como `title`.
 */
export function Sidebar({
  role,
  locale,
  collapsed = false,
  onNavigate,
}: {
  role: AppRole;
  locale: Locale;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groups = navGroupsFor(role).map(({ group, items }) => ({
    group,
    items: items.map((item) => ({ ...item, url: navUrl(item, locale) })),
  }));
  // El enlace activo es el más específico que coincide con la ruta actual.
  const active = groups
    .flatMap((g) => g.items)
    .filter(({ url }) => pathname === url || pathname.startsWith(`${url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0]?.url;

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-1">
        {groups.map(({ group, items }, index) => (
          <li
            key={group ?? "top"}
            aria-labelledby={group ? `nav-group-${group}` : undefined}
            className={index === 0 ? "" : collapsed ? "mt-2 border-t border-on-structure/20 pt-2" : "mt-5"}
          >
            {group && (
              <p
                id={`nav-group-${group}`}
                className={
                  collapsed
                    ? "sr-only"
                    : "mb-1.5 px-3 text-[0.75rem] font-semibold tracking-[0.06em] text-on-structure/80 uppercase"
                }
              >
                {t(`groups.${group}`)}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {items.map(({ key, icon, url }) => {
                const Icon = NAV_ICONS[icon];
                const label = t(`items.${key}`);
                const current = url === active;
                return (
                  <li key={key}>
                    <Link
                      href={url}
                      aria-current={current ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      onClick={onNavigate}
                      className={`${itemBase} ${collapsed ? "justify-center px-0" : ""} ${onStructureFocus} transition-colors duration-150 ${
                        current
                          ? "bg-highlight font-semibold text-on-highlight"
                          : "text-on-structure hover:bg-on-structure/10"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={current ? 2.25 : 1.75} />
                      <span className={collapsed ? "sr-only" : "flex-1"}>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
