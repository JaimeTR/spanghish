import { Button } from "@spanglish/ui";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileMenu } from "./MobileMenu";
import { RoleSwitcher } from "./RoleSwitcher";
import { Sidebar } from "./Sidebar";
import { onLightFocus, onStructureFocus } from "./shell-styles";

type LogoutAction = (formData: FormData) => void | Promise<void>;

function initialOf(name: string | undefined): string {
  return name?.trim().charAt(0).toLocaleUpperCase() ?? "";
}

function LogoutForm({
  action,
  locale,
  label,
  variant,
}: {
  action: LogoutAction;
  locale: Locale;
  label: string;
  variant: "secondary" | "highlight";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <Button
        type="submit"
        variant={variant}
        className={`px-4 text-sm ${variant === "highlight" ? onStructureFocus : ""}`}
      >
        <LogOut aria-hidden="true" className="size-4" strokeWidth={2} />
        {label}
      </Button>
    </form>
  );
}

/**
 * Barra superior del portal. Escritorio: selector de área, idioma, nombre y
 * salir. Móvil: botón de menú, logo e idioma; la navegación, el selector de
 * área y la salida van dentro del menú desplegable.
 */
export function Topbar({
  name,
  roles,
  area,
  locale,
  logout,
}: {
  name?: string;
  roles: AppRole[];
  area: AppRole;
  locale: Locale;
  logout: LogoutAction;
}) {
  const t = useTranslations("shell");
  const initial = initialOf(name);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <MobileMenu label={t("menu")}>
          <Sidebar role={area} locale={locale} />
          <RoleSwitcher roles={roles} current={area} locale={locale} tone="structure" className="mt-5 flex" />
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-on-structure/25 pt-5">
            {name ? <span className="min-w-0 truncate font-semibold">{name}</span> : <span />}
            <LogoutForm action={logout} locale={locale} label={t("logout")} variant="highlight" />
          </div>
        </MobileMenu>

        <Link
          href={`/${locale}/${area}`}
          className={`rounded-sm lg:hidden ${onLightFocus}`}
        >
          <Image src="/logo-spanglish.png" alt={t("home")} width={50} height={40} priority />
        </Link>

        <RoleSwitcher roles={roles} current={area} locale={locale} className="hidden lg:flex" />

        <div className="ml-auto flex items-center gap-4">
          <LocaleSwitch locale={locale} />
          {name && (
            <span className="hidden items-center gap-2.5 lg:flex">
              <span
                aria-hidden="true"
                className="inline-flex size-9 items-center justify-center rounded-full bg-highlight text-sm font-bold text-on-highlight"
              >
                {initial}
              </span>
              <span className="max-w-48 truncate text-sm font-semibold">{name}</span>
            </span>
          )}
          <div className="hidden lg:block">
            <LogoutForm action={logout} locale={locale} label={t("logout")} variant="secondary" />
          </div>
        </div>
      </div>
    </header>
  );
}
