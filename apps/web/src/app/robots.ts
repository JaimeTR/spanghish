import type { MetadataRoute } from "next";
import { SITE_NOINDEX, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Entornos de demostración (SITE_NOINDEX=1): nada se rastrea ni se indexa.
  if (SITE_NOINDEX) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
