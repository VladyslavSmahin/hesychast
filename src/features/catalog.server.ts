import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { PUBLIC_TAG, PUBLIC_REVALIDATE } from "@/features/publicCache";
import { mapProduct, PRODUCT_SELECT, type ProductRow } from "@/features/publicData.server";
import type { Product, Sticker } from "@/lib/types";

// Серверні запити для окремих сторінок каталогу (/tovar/<slug>, /katalog/<slug>).
// Головна тягне все одним махом через fetchPublicData; тут — точкові запити,
// щоб сторінка товару не вантажила весь каталог.

export interface CategoryInfo {
  id: string;
  name: string;
  /** назва російською; порожньо — показуємо українську */
  nameRu?: string | null;
  slug: string;
}

type PromoRow = { promo_price: number | string; valid_from: string | null; valid_until: string | null };

/** Найкраща акційна ціна на товар (активна, у межах дат, нижча за каталожну) або null. */
function bestPromoPrice(rows: PromoRow[] | null, basePrice: number): number | null {
  const now = Date.now();
  let best: number | null = null;
  for (const pr of rows ?? []) {
    if (pr.valid_from && new Date(pr.valid_from).getTime() > now) continue;
    if (pr.valid_until && new Date(pr.valid_until).getTime() < now) continue;
    const pp = Number(pr.promo_price);
    if (pp > 0 && pp < basePrice) best = best == null ? pp : Math.min(best, pp);
  }
  return best;
}

/** Товар за slug разом із його категорією. null — товару немає або він прихований. */
async function fetchProductBySlugUncached(
  slug: string
): Promise<{ product: Product; category: CategoryInfo | null } | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, name_ru, description, description_ru, price, weight, weight_ru, badge, image_path, images, availability, sizes, colors, sticker_option, sticker_price, size_chart_image, hidden_in_menu, coming_soon, category:categories(id, name, name_ru, slug)")
    .eq("slug", slug)
    .eq("is_available", true)
    .maybeSingle();

  if (error) console.error("product by slug:", error.message);
  if (!data) return null;

  type CatRow = { id: string; name: string; name_ru: string | null; slug: string };
  const rawCat = data.category as unknown as CatRow | CatRow[] | null;
  const catRow = Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat;
  const category: CategoryInfo | null = catRow
    ? { id: catRow.id, name: catRow.name, nameRu: catRow.name_ru, slug: catRow.slug }
    : null;

  const product = mapProduct({
    ...(data as unknown as ProductRow),
    category: category ? { slug: category.slug } : null,
  });

  const { data: promos } = await supabase
    .from("promos")
    .select("promo_price, valid_from, valid_until")
    .eq("product_id", product.id)
    .eq("is_active", true);

  const promoPrice = bestPromoPrice(promos as PromoRow[] | null, product.price);
  if (promoPrice != null) {
    product.oldPrice = product.price;
    product.price = promoPrice;
  }

  return { product, category };
}

/** Категорія за slug + її доступні товари (з акційними цінами). null — категорії немає. */
async function fetchCategoryBySlugUncached(
  slug: string
): Promise<{ category: CategoryInfo; products: Product[] } | null> {
  const supabase = createAnonClient();

  const { data: cat } = await supabase
    .from("categories")
    .select("id, name, name_ru, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!cat) return null;

  const { data: rows } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", cat.id)
    .eq("is_available", true)
    .eq("hidden_in_menu", false)
    .order("sort_order");

  const products = ((rows ?? []) as unknown as ProductRow[]).map(mapProduct);
  await applyPromos(products);

  const catInfo = cat as { id: string; name: string; name_ru: string | null; slug: string };
  return { category: { id: catInfo.id, name: catInfo.name, nameRu: catInfo.name_ru, slug: catInfo.slug }, products };
}

/** Кілька товарів тієї ж категорії, крім поточного (блок «Схожі товари»). */
async function fetchRelatedProductsUncached(categorySlug: string, exceptId: string, limit = 4): Promise<Product[]> {
  if (!categorySlug) return [];
  const supabase = createAnonClient();

  const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (!cat) return [];

  const { data: rows } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", cat.id)
    .eq("is_available", true)
    .eq("hidden_in_menu", false)
    .neq("id", exceptId)
    .order("sort_order")
    .limit(limit);

  const products = ((rows ?? []) as unknown as ProductRow[]).map(mapProduct);
  await applyPromos(products);
  return products;
}

/** Проставляє акційні ціни списку товарів одним запитом. */
async function applyPromos(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("promos")
    .select("product_id, promo_price, valid_from, valid_until")
    .in("product_id", products.map((p) => p.id))
    .eq("is_active", true);

  const byProduct = new Map<string, PromoRow[]>();
  for (const row of (data ?? []) as (PromoRow & { product_id: string })[]) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  for (const p of products) {
    const promoPrice = bestPromoPrice(byProduct.get(p.id) ?? null, p.price);
    if (promoPrice != null) {
      p.oldPrice = p.price;
      p.price = promoPrice;
    }
  }
}

export interface SitemapEntry {
  slug: string;
  createdAt: string | null;
}

/**
 * Slug-и доступних товарів і активних категорій із датами — для sitemap.
 * Навмисно клієнт без cookies: sitemap не залежить від користувача, інакше
 * Next не може відрендерити маршрут і карта сайту лишається без товарів.
 */
export async function fetchAllSlugs(): Promise<{ products: SitemapEntry[]; categories: SitemapEntry[] }> {
  const supabase = createAnonClient();
  const [prods, cats] = await Promise.all([
    supabase.from("products").select("slug, created_at").eq("is_available", true),
    supabase.from("categories").select("slug, created_at").eq("is_active", true),
  ]);
  const map = (rows: unknown) =>
    ((rows ?? []) as { slug: string; created_at: string | null }[]).map((r) => ({ slug: r.slug, createdAt: r.created_at }));
  return { products: map(prods.data), categories: map(cats.data) };
}

// Кешовані обгортки. Ключ включає slug, тож у кеші лежить окремий запис на
// кожен товар і категорію; адмінка скидає їх усі одним тегом PUBLIC_TAG.
const cacheOpts = { tags: [PUBLIC_TAG], revalidate: PUBLIC_REVALIDATE };

// Кириличні slug-и («бальзам-07vc1») Next віддає в params закодованими (%D0%B1…),
// а в БД вони звичайним текстом — без декодування сторінка давала 404.
function decodeSlug(slug: string): string {
  try { return decodeURIComponent(slug); } catch { return slug; }
}

export const fetchProductBySlug = (raw: string) => {
  const slug = decodeSlug(raw);
  return unstable_cache(fetchProductBySlugUncached, ["product-by-slug", slug], cacheOpts)(slug);
};

export const fetchCategoryBySlug = (raw: string) => {
  const slug = decodeSlug(raw);
  return unstable_cache(fetchCategoryBySlugUncached, ["category-by-slug", slug], cacheOpts)(slug);
};

export const fetchRelatedProducts = (categorySlug: string, exceptId: string, limit = 4) =>
  unstable_cache(fetchRelatedProductsUncached, ["related", categorySlug, exceptId], cacheOpts)(categorySlug, exceptId, limit);

/** Активні наклейки (сторінка товару рендериться без загального PublicDataProvider). */
async function fetchStickersUncached(): Promise<Sticker[]> {
  const { data } = await createAnonClient()
    .from("stickers").select("id, name, image_path").eq("is_active", true).order("sort_order");
  return ((data ?? []) as { id: string; name: string; image_path: string }[])
    .map((s) => ({ id: s.id, name: s.name, image: s.image_path }));
}

export const fetchStickers = unstable_cache(fetchStickersUncached, ["stickers"], {
  tags: [PUBLIC_TAG],
  revalidate: PUBLIC_REVALIDATE,
});
