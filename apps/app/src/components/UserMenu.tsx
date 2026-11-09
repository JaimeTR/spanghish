"use client";

import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { onLightFocus } from "./shell-styles";

type LogoutAction = (formData: FormData) => void | Promise<void>;

const itemClass = `flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-text hover:bg-surface-sunken ${onLightFocus}`;

/**
 * Menú de la cuenta (patrón disclosure, no modal): avatar y nombre abren un
 * panel con Mi cuenta, Configuración y Cerrar sesión. Escape o un clic fuera lo
 * cierran y el foco vuelve al botón; elegir un enlace también lo cierra.
 */
export function UserMenu({ name, locale, logout }: { name?: string; locale: Locale; logout: LogoutAction }) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initial = name?.trim().charAt(0).toLocaleUpperCase() ?? "";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-testid="user-menu-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-11 items-center gap-2.5 rounded-md py-1 pr-2 pl-1 hover:bg-surface-sunken ${onLightFocus}`}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-full bg-highlight text-sm font-bold text-on-highlight"
        >
          {initial || <UserRound className="size-5" strokeWidth={2} />}
        </span>
        <span className="hidden max-w-44 truncate text-sm font-semibold sm:block">{name ?? t("userMenu")}</span>
        <span className="sr-only sm:hidden">{t("userMenu")}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-text-muted" strokeWidth={2} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={id}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
          }}
          className="absolute top-full right-0 z-30 mt-2 w-60 rounded-lg border border-line bg-surface p-2 shadow-[0_12px_24px_-8px_rgb(30_18_38/0.28)]"
        >
          {name && <p className="truncate px-3 py-2 text-sm font-semibold text-text-muted">{name}</p>}
          <Link href={`/${locale}/account`} className={itemClass}>
            <UserRound aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
            {t("myAccount")}
          </Link>
          <Link href={`/${locale}/account/settings`} className={itemClass}>
            <Settings aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
            {t("settings")}
          </Link>
          <form action={logout} className="mt-1 border-t border-line pt-1">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className={itemClass}>
              <LogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
              {t("logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
