"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { Sidebar } from "./Sidebar";
import { onStructureFocus } from "./shell-styles";

const STORAGE_KEY = "spanglish.sidebar.collapsed";

type LogoutAction = (formData: FormData) => void | Promise<void>;

/**
 * Barra lateral de escritorio: altura completa, logo con un botón de solo icono
 * al lado para minimizarla a solo iconos (recuerda la elección en el navegador;
 * si no se puede leer o escribir, funciona igual, abierta), navegación agrupada
 * con desplazamiento propio (sin barra visible) y "Cerrar sesión" al final.
 */
export function DesktopSidebar({ area, locale, logout }: { area: AppRole; locale: Locale; logout: LogoutAction }) {
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

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? t("expandMenu") : t("collapseMenu");

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={`hidden bg-structure text-on-structure transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0 lg:flex-col lg:py-5 motion-reduce:transition-none ${
        collapsed ? "lg:w-[4.75rem] lg:px-2" : "lg:w-64 lg:px-4"
      }`}
    >
      <div className={collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-2 px-2"}>
        <Link href={`/${locale}/${area}`} className={`rounded-sm ${onStructureFocus}`}>
          <Image
            src="/logo-spanglish.png"
            alt={t("home")}
            width={collapsed ? 44 : 88}
            height={collapsed ? 35 : 70}
            priority
          />
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          aria-expanded={!collapsed}
          title={label}
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md text-on-structure transition-colors duration-150 hover:bg-on-structure/10 ${onStructureFocus}`}
        >
          <ToggleIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Se desplaza con rueda, teclado o táctil, pero sin barra de desplazamiento visible. */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Sidebar role={area} locale={locale} collapsed={collapsed} />
      </div>

      <form action={logout} className="mt-4 border-t border-on-structure/25 pt-4">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          title={collapsed ? t("logout") : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[0.9375rem] text-on-structure transition-colors duration-150 hover:bg-on-structure/10 ${
            collapsed ? "justify-center px-0" : ""
          } ${onStructureFocus}`}
        >
          <LogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <span className={collapsed ? "sr-only" : ""}>{t("logout")}</span>
        </button>
      </form>
    </aside>
  );
}
