import type { MetadataRoute } from "next";
import { SITE_URL, IS_PUBLIC_DOMAIN } from "@/lib/siteUrl";

// Генерує /robots.txt. Адмінка та API — закриті від індексації
// (вони й так під гардом, але не мають потрапляти у видачу).
//
// Поки домен тимчасовий — закриваємо сайт цілком, щоб у видачу не потрапила
// адреса, з якої потім доведеться переїжджати. Див. IS_PUBLIC_DOMAIN.
export default function robots(): MetadataRoute.Robots {
  if (!IS_PUBLIC_DOMAIN) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

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
