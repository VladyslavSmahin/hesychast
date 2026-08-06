import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

// Генерує /robots.txt. Адмінка та API — закриті від індексації
// (вони й так під гардом, але не мають потрапляти у видачу).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
