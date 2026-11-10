import type { MetadataRoute } from "next";
import { getPublicArticleSlugs } from "@/lib/content-source";
import { sitemapEntries } from "@/lib/seo";
import { loadTeacherSlugs } from "@/lib/teachers-source";

// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teachers, lessons] = await Promise.all([loadTeacherSlugs(), getPublicArticleSlugs()]);
  return sitemapEntries(undefined, undefined, teachers, lessons);
}
