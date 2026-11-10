import type { MetadataRoute } from "next";
import { robotsRules } from "@/lib/indexing";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(SITE_URL);
}
