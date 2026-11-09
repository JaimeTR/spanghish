import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo";
import { loadTeacherSlugs } from "@/lib/teachers-source";

// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(undefined, undefined, await loadTeacherSlugs());
}
