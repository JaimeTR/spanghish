import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { switchableAreas } from "@/lib/nav";
import { onLightFocus, onStructureFocus } from "./shell-styles";

const tones = {
  light: {
    group: "border border-line bg-surface",
    focus: onLightFocus,
    current: "bg-structure text-on-structure",
    other: "text-text-muted hover:bg-surface-sunken hover:text-text",
  },
  structure: {
    group: "border border-on-structure/30",
    focus: onStructureFocus,
    current: "bg-highlight text-on-highlight",
    other: "text-on-structure hover:bg-on-structure/10",
  },
} as const;

/**
 * Selector de área para quien tiene varios roles (p. ej. docente + alumno).
 * Solo lista sus propias áreas permitidas; con una sola área no se muestra.
 */
export function RoleSwitcher({
  roles,
  current,
  locale,
  tone = "light",
  className = "",
}: {
  roles: AppRole[];
  current: AppRole;
  locale: Locale;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const t = useTranslations("shell");
  const ta = useTranslations("areas");
  const areas = switchableAreas(roles, locale);
  if (areas.length < 2) return null;
  const style = tones[tone];

  return (
    <div
      role="group"
      aria-label={t("areaSwitcher")}
      className={`items-center gap-0.5 rounded-md p-0.5 ${style.group} ${className}`}
    >
      {areas.map(({ area, href }) => (
        <Link
          key={area}
          href={href}
          aria-current={area === current ? "true" : undefined}
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-[6px] px-3 text-sm font-semibold transition-colors duration-150 ${style.focus} ${
            area === current ? style.current : style.other
          }`}
        >
          {ta(area)}
        </Link>
      ))}
    </div>
  );
}
