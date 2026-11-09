import { useTranslations } from "next-intl";
import type { AccessLevel } from "@spanglish/content";
export function AccessBadge({ level }: { level: AccessLevel }) {
  const t = useTranslations("enums.accessLevel");
  const colors: Record<AccessLevel, string> = { public: "bg-brand-yellow text-text", account: "bg-brand-purple text-on-structure", enrolled: "bg-brand-burgundy text-on-structure" };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level]}`}>{t(level)}</span>;
}
