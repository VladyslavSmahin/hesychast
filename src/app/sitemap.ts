import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { fetchAllSlugs } from "@/features/catalog.server";

// Генерує /sitemap.xml. Товари й категорії беруться з БД, тож новий товар,
// доданий в адмінці, потрапляє в карту сайту сам — без правок коду.

// Інакше карта збиралася б лише на білді й новий товар не з'явився б у ній
// до наступного деплою. Година — розумний компроміс для пошуковика.
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/oferta`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const { products, categories } = await fetchAllSlugs();
    return [
      ...staticPages,
      ...categories.map((c) => ({
        url: `${SITE_URL}/katalog/${c.slug}`,
        lastModified: c.createdAt ? new Date(c.createdAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${SITE_URL}/tovar/${p.slug}`,
        lastModified: p.createdAt ? new Date(p.createdAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (e) {
    // БД недоступна — віддаємо хоча б статичні сторінки, а не 500
    console.error("sitemap:", (e as Error).message);
    return staticPages;
  }
}
