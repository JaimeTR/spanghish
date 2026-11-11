import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { activeNavKey, type RouteKey } from "@/lib/routes";
import { serializeJsonLd } from "@/lib/structured-data";
import { RevealOnScroll } from "./RevealOnScroll";
import { ShopCartProvider } from "./shop/ShopCartProvider";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Esqueleto común de todas las páginas: enlace para saltar al contenido,
 * cabecera (con la sección activa marcada), <main>, pie y JSON-LD. El carrito
 * (CartProvider) envuelve cabecera y contenido sin añadir nodos al DOM.
 */
export function PageShell({
  locale,
  route,
  jsonLd = [],
  children,
}: {
  locale: Locale;
  route: RouteKey;
  jsonLd?: unknown[];
  children: ReactNode;
}) {
  const t = useTranslations("a11y");

  // Un único nodo raíz: con varios (fragmento), Next hace scrollIntoView de cada
  // uno al navegar y, con scroll suave, la página terminaba cerca del final.
  return (
    <div>
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-full bg-ink px-5 py-3 font-bold text-cream no-underline [--focus-color:var(--brand-yellow)] focus:translate-y-0"
      >
        {t("skip")}
      </a>
      <ShopCartProvider>
        <SiteHeader locale={locale} current={activeNavKey(route)} route={route} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} />
      </ShopCartProvider>
      <RevealOnScroll />
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}
    </div>
  );
}
