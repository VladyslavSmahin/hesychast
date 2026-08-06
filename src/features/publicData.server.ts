import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product, Badge, Promo, Banner } from "@/lib/types";
import type { PublicData, PubCategory, PubSubcategory, PubReview } from "@/features/publicData";
import { parseDeliverySettings } from "@/lib/delivery";
import { NAV_SPECIALS, parseNavVisibility } from "@/lib/navSpecials";
import { parseGlossary } from "@/lib/glossary";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export type ProductRow = {
  id: string; slug: string; name: string; description: string | null;
  price: number | string; weight: string | null; badge: string | null; image_path: string | null;
  category: { slug: string } | { slug: string }[] | null;
};

/** Поля товару, які потрібні витрині (спільний select для всіх публічних запитів). */
export const PRODUCT_SELECT =
  "id, slug, name, description, price, weight, badge, image_path, sort_order, category:categories(slug)";

export function mapProduct(p: ProductRow): Product {
  const cat = p.category;
  const categorySlug = Array.isArray(cat) ? cat[0]?.slug ?? "" : cat?.slug ?? "";
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    desc: p.description ?? "",
    fullDesc: p.description ?? "",
    composition: "",
    price: num(p.price),
    weight: p.weight ?? "",
    pieces: "",
    badge: (p.badge ?? "") as Badge,
    category: categorySlug,
    subcategory: undefined,
    ingredients: [],
    photo: p.image_path ?? null,
  };
}

export async function fetchPublicData(): Promise<PublicData> {
  const supabase = await createClient();

  const [catsRes, prodsRes, promosRes, bannersRes, deliveryRes, reviewsRes] = await Promise.all([
    supabase.from("categories").select("id, name, slug, sort_order, show_in_nav, is_active").order("sort_order"),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_available", true)
      .order("sort_order"),
    supabase.from("promos").select("id, promo_price, valid_from, valid_until, product:products(id)").eq("is_active", true).order("sort_order"),
    supabase.from("banners").select("id, image_path").eq("is_active", true).order("sort_order"),
    supabase.from("settings").select("key, value").in("key", ["delivery", "nav_specials", "glossary"]),
    supabase.from("reviews").select("id, author_name, rating, text, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(24),
  ]);

  if (catsRes.error) console.error("categories fetch:", catsRes.error.message);
  if (prodsRes.error) console.error("products fetch:", prodsRes.error.message);
  if (promosRes.error) console.error("promos fetch:", promosRes.error.message);
  if (bannersRes.error) console.error("banners fetch:", bannersRes.error.message);
  if (reviewsRes.error) console.error("reviews fetch:", reviewsRes.error.message);

  const categories: PubCategory[] = (catsRes.data ?? []).map((c) => ({
    id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order, showInNav: c.show_in_nav, isActive: c.is_active,
  }));

  // підкатегорій у спрощеній схемі немає
  const subcategories: PubSubcategory[] = [];

  // ефективна акційна ціна на товар: активна акція в межах дат і нижча за каталожну
  const now = Date.now();
  const promoByProduct = new Map<string, number>();
  for (const pr of (promosRes.data ?? []) as { promo_price: number | string; valid_from: string | null; valid_until: string | null; product: { id: string } | { id: string }[] | null }[]) {
    const prod = pr.product;
    const pid = Array.isArray(prod) ? prod[0]?.id : prod?.id;
    if (!pid) continue;
    if (pr.valid_from && new Date(pr.valid_from).getTime() > now) continue;
    if (pr.valid_until && new Date(pr.valid_until).getTime() < now) continue;
    const pp = Number(pr.promo_price);
    if (pp > 0) promoByProduct.set(pid, Math.min(promoByProduct.get(pid) ?? Infinity, pp));
  }

  const catalog = ((prodsRes.data ?? []) as unknown as ProductRow[]).map(mapProduct).map((p) => {
    const pp = promoByProduct.get(p.id);
    return pp != null && pp < p.price ? { ...p, oldPrice: p.price, price: pp } : p;
  });

  const promos: Promo[] = (promosRes.data ?? []).map((p) => {
    const prod = p.product as { id: string } | { id: string }[] | null;
    const linkedItemId = Array.isArray(prod) ? prod[0]?.id ?? "" : prod?.id ?? "";
    return {
      id: p.id, bannerImage: "", label: "", title: "",
      price: Number(p.promo_price), oldPrice: 0, linkedItemId,
    };
  });

  const banners: Banner[] = ((bannersRes.data ?? []) as { id: string; image_path: string }[])
    .map((b) => ({ id: b.id, image: b.image_path }));

  const settingsRows = (deliveryRes.data ?? []) as { key: string; value: unknown }[];
  const delivery = parseDeliverySettings(settingsRows.find((r) => r.key === "delivery")?.value);
  const navVis = parseNavVisibility(settingsRows.find((r) => r.key === "nav_specials")?.value);
  const glossary = parseGlossary(settingsRows.find((r) => r.key === "glossary")?.value);
  // підписи спец-пунктів навігації беремо з глосарію
  const navLabel: Record<string, string> = { novynky: glossary.nav_novynky, aktsii: glossary.nav_aktsii };
  const navSpecials = NAV_SPECIALS.filter((sp) => navVis[sp.id]).map((sp) => ({ ...sp, label: navLabel[sp.id] ?? sp.label }));

  const reviews: PubReview[] = ((reviewsRes.data ?? []) as { id: string; author_name: string; rating: number | null; text: string; created_at: string }[]).map((r) => ({
    id: r.id, authorName: r.author_name, rating: r.rating, text: r.text, createdAt: r.created_at,
  }));

  // ДЕМО-ФОЛБЕК: поки в Supabase немає товарів (порожня/непобудована БД) —
  // віддаємо демо-каталог, щоб було що верстати. Зникне сам, коли зʼявляться товари.
  if (catalog.length === 0) {
    const { demoCategories, demoProducts, demoReviews } = await import("@/data/demo");
    return {
      catalog: demoProducts,
      categories: categories.length ? categories : demoCategories,
      subcategories, promos, banners, delivery, navSpecials, glossary,
      reviews: reviews.length ? reviews : demoReviews,
    };
  }

  return { catalog, categories, subcategories, promos, banners, delivery, navSpecials, glossary, reviews };
}
