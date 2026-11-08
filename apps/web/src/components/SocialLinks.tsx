import { useTranslations } from "next-intl";
import { SOCIAL } from "@/lib/site";

/** Redes sociales como píldoras; sobre fondo oscuro (pie) o claro. */
export function SocialLinks({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const t = useTranslations("a11y");
  const pill =
    tone === "dark"
      ? "border-on-structure/35 text-on-structure hover:border-brand-yellow hover:bg-brand-yellow hover:text-ink"
      : "border-ink/25 bg-surface text-ink hover:border-ink hover:bg-ink hover:text-cream";
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {SOCIAL.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold no-underline transition-[color,background-color,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${pill}`}
          >
            {s.label}
            <span className="sr-only"> {t("opensSite", { name: s.label })}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
