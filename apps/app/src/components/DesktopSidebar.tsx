"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { Sidebar } from "./Sidebar";
import { onStructureFocus } from "./shell-styles";

const STORAGE_KEY = "spanglish.sidebar.collapsed";

/**
 * Barra lateral de escritorio: altura completa, logo arriba, navegación
 * agrupada con desplazamiento propio y un botón para minimizarla a solo
 * iconos. La preferencia se recuerda en el navegador (si no se puede leer o
 * escribir, la barra funciona igual, abierta).
 */
export function DesktopSidebar({ area, locale }: { area: AppRole; locale: Locale }) {
  const t = useTranslations("shell");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // Preferencia guardada: solo existe en el navegador, por eso se lee tras montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* sin almacenamiento: queda abierta */
    }
  }, []);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* no se recuerda; no es grave */
      }
      return next;
    });
  }

  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
  const label = collapsed ? t("expandMenu") : t("collapseMenu");

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={`hidden bg-structure text-on-structure transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0 lg:flex-col lg:py-5 motion-reduce:transition-none ${
        collapsed ? "lg:w-[4.75rem] lg:px-2" : "lg:w-64 lg:px-4"
      }`}
    >
      <Link
        href={`/${locale}/${area}`}
        className={`rounded-sm ${collapsed ? "self-center" : "self-start px-2"} ${onStructureFocus}`}
      >
        <Image
          src="/logo-spanglish.png"
          alt={t("home")}
          width={collapsed ? 44 : 88}
          height={collapsed ? 35 : 70}
          priority
        />
      </Link>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:rgb(255_255_255/0.4)_transparent] [scrollbar-width:thin]">
        <Sidebar role={area} locale={locale} collapsed={collapsed} />
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        title={collapsed ? label : undefined}
        className={`mt-4 flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] text-on-structure transition-colors duration-150 hover:bg-on-structure/10 ${
          collapsed ? "justify-center px-0" : ""
        } ${onStructureFocus}`}
      >
        <ToggleIcon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
        <span className={collapsed ? "sr-only" : ""}>{label}</span>
      </button>
    </aside>
  );
}
