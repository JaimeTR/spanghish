import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { logout } from "@/lib/auth-actions";
import { DesktopSidebar } from "./DesktopSidebar";
import { Topbar } from "./Topbar";
import { onLightFocus } from "./shell-styles";

/**
 * Marco del portal: barra lateral morada (escritorio), barra superior y
 * contenido sobre crema. El área y el usuario los decide el layout de zona,
 * después de requireArea.
 */
export function PortalShell({
  area,
  locale,
  name,
  avatarPath,
  roles,
  bell,
  children,
}: {
  bell?: React.ReactNode;
  area: AppRole;
  locale: Locale;
  name?: string;
  avatarPath?: string;
  roles: AppRole[];
  children: React.ReactNode;
}) {
  const t = useTranslations("shell");

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className={`sr-only z-30 rounded-md bg-surface px-4 py-3 font-semibold text-structure focus:not-sr-only focus:fixed focus:top-3 focus:left-3 ${onLightFocus}`}
      >
        {t("skipToContent")}
      </a>

      <DesktopSidebar area={area} locale={locale} logout={logout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} avatarPath={avatarPath} roles={roles} area={area} locale={locale} logout={logout} bell={bell} />
        <main id="main" tabIndex={-1} className="w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
