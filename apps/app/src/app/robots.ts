import type { MetadataRoute } from "next";

/** El portal es privado: ningún buscador debe rastrearlo, en ningún entorno. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
