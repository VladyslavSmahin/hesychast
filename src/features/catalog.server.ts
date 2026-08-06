import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapProduct, PRODUCT_SELECT, type ProductRow } from "@/features/publicData.server";
import type { Product } from "@/lib/types";

// Серверні запити для окремих сторінок каталогу (/tovar/<slug>, /katalog/<slug>).
// Головна тягне все одним махом через fetchPublicData; тут — точкові запити,
// щоб сторінка товару не вантажила весь каталог.

export interface CategoryInfo {
  id: string;
  name: string;
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
export async function fetchProductBySlug(
  slug: string
): Promise<{ product: Product; category: CategoryInfo | null } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price, weight, badge, image_path, category:categories(id, name, slug)")
    .eq("slug", slug)
    .eq("is_available", true)
    .maybeSingle();

  if (error) console.error("product by slug:", error.message);
  if (!data) return null;

  const rawCat = data.category as unknown as CategoryInfo | CategoryInfo[] | null;
  const category = Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat;

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
export async function fetchCategoryBySlug(
  slug: string
): Promise<{ category: CategoryInfo; products: Product[] } | null> {
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!cat) return null;

  const { data: rows } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", cat.id)
    .eq("is_available", true)
    .order("sort_order");

  const products = ((rows ?? []) as unknown as ProductRow[]).map(mapProduct);
  await applyPromos(products);

  return { category: cat as CategoryInfo, products };
}

/** Кілька товарів тієї ж категорії, крім поточного (блок «Схожі товари»). */
export async function fetchRelatedProducts(categorySlug: string, exceptId: string, limit = 4): Promise<Product[]> {
  if (!categorySlug) return [];
  const supabase = await createClient();

  const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (!cat) return [];

  const { data: rows } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", cat.id)
    .eq("is_available", true)
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
  const supabase = await createClient();
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

/** Усі slug-и доступних товарів і активних категорій — для sitemap. */
export async function fetchAllSlugs(): Promise<{ products: string[]; categories: string[] }> {
  const supabase = await createClient();
  const [prods, cats] = await Promise.all([
    supabase.from("products").select("slug").eq("is_available", true),
    supabase.from("categories").select("slug").eq("is_active", true),
  ]);
  return {
    products: ((prods.data ?? []) as { slug: string }[]).map((r) => r.slug),
    categories: ((cats.data ?? []) as { slug: string }[]).map((r) => r.slug),
  };
}
