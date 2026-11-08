import { useTranslations } from "next-intl";
import { SOCIAL } from "@/lib/site";
import { SOCIAL_GLYPHS } from "./social-glyphs";

type SocialKey = (typeof SOCIAL)[number]["key"];

// Colores oficiales de cada red (glifo blanco encima; contraste de icono >= 3:1).
const BRAND_BG: Record<SocialKey, string> = {
  facebook: "#1877F2",
  instagram: "linear-gradient(45deg, #E8592A 0%, #DD2A7B 45%, #8134AF 78%, #515BD4 100%)",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  threads: "#000000",
};

/** TikTok lleva su sombra cian y rosa de marca. */
const GLYPH_FILTER: Partial<Record<SocialKey, string>> = {
  tiktok: "drop-shadow(1.2px 1.2px 0 #FE2C55) drop-shadow(-1.2px -1.2px 0 #25F4EE)",
};

/**
 * Redes sociales como botones redondos con el icono y el color de cada marca.
 * El nombre de la red va como texto oculto (el icono es decorativo). En el pie
 * oscuro llevan un aro claro para que las negras (TikTok, Threads) se vean.
 */
export function SocialLinks({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const t = useTranslations("a11y");
  const ring = tone === "dark" ? "ring-2 ring-on-structure/40" : "ring-2 ring-ink/10";
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {SOCIAL.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            rel="noopener noreferrer"
            style={{ background: BRAND_BG[s.key] }}
            className={`inline-flex size-11 items-center justify-center rounded-full text-white no-underline shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:scale-110 hover:shadow-lg active:scale-100 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 ${ring}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[22px]" fill="currentColor" style={{ filter: GLYPH_FILTER[s.key] }}>
              <path d={SOCIAL_GLYPHS[s.key]} />
            </svg>
            <span className="sr-only">
              {s.label} {t("opensSite", { name: s.label })}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
