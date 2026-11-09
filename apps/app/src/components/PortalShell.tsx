import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { logout } from "@/lib/auth-actions";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { onLightFocus, onStructureFocus } from "./shell-styles";

/**
 * Marco del portal: barra lateral morada (escritorio), barra superior y
 * contenido sobre crema. El área y el usuario los decide el layout de zona,
 * después de requireArea.
 */
export function PortalShell({
  area,
  locale,
  name,
  roles,
  children,
}: {
  area: AppRole;
  locale: Locale;
  name?: string;
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

      <aside className="hidden bg-structure text-on-structure lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col lg:gap-8 lg:overflow-y-auto lg:px-4 lg:py-6">
        <Link
          href={`/${locale}/${area}`}
          className={`self-start rounded-sm px-2 ${onStructureFocus}`}
        >
          <Image src="/logo-spanglish.png" alt={t("home")} width={88} height={70} priority />
        </Link>
        <Sidebar role={area} locale={locale} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} roles={roles} area={area} locale={locale} logout={logout} />
        <main id="main" tabIndex={-1} className="w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
