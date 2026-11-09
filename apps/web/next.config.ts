import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@spanglish/ui", "@spanglish/content"],
  /**
   * URLs de la web anterior (WordPress) que cambian de slug: van a la ruta sin
   * idioma y el proxy elige /es o /en según el navegador.
   */
  async redirects() {
    return [
      { source: "/learn-spanish/spanish-foundations/spanish-alphabet", destination: "/learn/alphabet", permanent: true },
      { source: "/learn-spanish/spanish-adults-lessons/level-a1/the-nouns-in-spanish", destination: "/learn/nouns-and-articles", permanent: true },
      { source: "/learn-spanish/:path*", destination: "/learn", permanent: true },
      { source: "/product/:slug*", destination: "/shop", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
