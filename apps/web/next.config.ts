import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Fotos de docentes: viven en el bucket público content-media de Supabase.
 * Solo se permite ese servidor y esa ruta; en local (127.0.0.1) next/image exige
 * además aceptar IPs locales, algo que nunca se activa en producción.
 */
function supabaseImages(): NonNullable<NextConfig["images"]> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return {};
  try {
    const url = new URL(raw);
    const isLocal = ["127.0.0.1", "localhost"].includes(url.hostname);
    return {
      remotePatterns: [
        {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          port: url.port,
          pathname: "/storage/v1/object/public/content-media/**",
        },
      ],
      ...(isLocal && process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : {}),
    };
  } catch {
    return {};
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@spanglish/ui", "@spanglish/content"],
  images: supabaseImages(),
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
      { source: "/mediplus-doctor/maribel-mayhua", destination: "/teachers/maribel-mayhua", permanent: true },
      { source: "/mediplus-doctor/pamela", destination: "/teachers/pamela-rojas", permanent: true },
      { source: "/mediplus-doctor/:path*", destination: "/teachers", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
