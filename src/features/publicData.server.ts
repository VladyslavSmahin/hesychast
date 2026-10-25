import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { PUBLIC_TAG, PUBLIC_REVALIDATE } from "@/features/publicCache";
import type { Product, Badge, Banner, Availability, ProductColor, Sticker, NewsPost, GalleryItem, VideoItem } from "@/lib/types";
import type { PublicData, PubCategory, PubReview } from "@/features/publicData";
import { NAV_SPECIALS, parseNavVisibility } from "@/lib/navSpecials";
import { parseGlossary } from "@/lib/glossary";
import { parseSections, type SectionVisibility } from "@/lib/sections";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export type ProductRow = {
  id: string; slug: string; name: string; description: string | null;
  price: number | string; weight: string | null; badge: string | null; image_path: string | null;
  images?: string[] | null;
  name_ru?: string | null;
  description_ru?: string | null;
  weight_ru?: string | null;
  availability?: string | null;
  sizes?: string[] | null;
  colors?: unknown;
  sticker_option?: boolean | null;
  sticker_price?: number | string | null;
  size_chart_image?: string | null;
  category: { slug: string } | { slug: string }[] | null;
};

/** Безпечний парс jsonb-кольорів товару. */
function parseColors(v: unknown): ProductColor[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is { name?: unknown; hex?: unknown } => !!c && typeof c === "object")
    .map((c) => ({ name: String(c.name ?? ""), hex: String(c.hex ?? "#000000") }))
    .filter((c) => c.name);
}

/** Поля товару, які потрібні витрині (спільний select для всіх публічних запитів). */
export const PRODUCT_SELECT =
  "id, slug, name, name_ru, description, description_ru, price, weight, weight_ru, badge, image_path, images, availability, sizes, colors, sticker_option, sticker_price, size_chart_image, sort_order, category:categories(slug)";

export function mapProduct(p: ProductRow): Product {
  const cat = p.category;
  const categorySlug = Array.isArray(cat) ? cat[0]?.slug ?? "" : cat?.slug ?? "";
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameRu: p.name_ru || null,
    desc: p.description ?? "",
    descRu: p.description_ru || null,
    price: num(p.price),
    weight: p.weight ?? "",
    weightRu: p.weight_ru || null,
    badge: (p.badge ?? "") as Badge,
    category: categorySlug,
    photo: p.image_path ?? null,
    photos: [p.image_path, ...(p.images ?? [])].filter((x): x is string => !!x),
    availability: (p.availability ?? "in_stock") as Availability,
    sizes: p.sizes ?? [],
    colors: parseColors(p.colors),
    stickerOption: Boolean(p.sticker_option),
    stickerPrice: num(p.sticker_price),
    sizeChart: p.size_chart_image ?? null,
  };
}

/**
 * Читання даних витрини. Навмисно клієнт БЕЗ cookies: сторінка однакова для всіх
 * відвідувачів, тож її можна кешувати. Зі звичайним серверним клієнтом Next
 * вважав би сторінку персональною й ходив у БД на кожен запит.
 */
async function fetchPublicDataUncached(): Promise<PublicData> {
  const supabase = createAnonClient();

  const [catsRes, prodsRes, promosRes, bannersRes, settingsRes, reviewsRes, stickersRes, newsRes, galleryRes, videosRes] = await Promise.all([
    supabase.from("categories").select("id, name, name_ru, slug, sort_order, show_in_nav, is_active").order("sort_order"),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_available", true)
      .order("sort_order"),
    supabase.from("promos").select("id, promo_price, valid_from, valid_until, product:products(id)").eq("is_active", true).order("sort_order"),
    supabase.from("banners").select("id, image_path").eq("is_active", true).order("sort_order"),
    supabase.from("settings").select("key, value").in("key", ["nav_specials", "glossary", "sections"]),
    supabase.from("reviews").select("id, author_name, rating, text, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(24),
    supabase.from("stickers").select("id, name, image_path").eq("is_active", true).order("sort_order"),
    supabase
      .from("tg_posts")
      .select("id, text, image_path, link, posted_at, channel:tg_channels!inner(username, title, title_auto, is_active)")
      .eq("channel.is_active", true)
      .order("posted_at", { ascending: false })
      .limit(30),
    supabase.from("gallery_items").select("id, image_path, author_name, text").eq("is_active", true).order("sort_order"),
    supabase.from("video_items").select("id, video_path, poster_path, author_name, text").eq("is_active", true).order("sort_order"),
  ]);

  if (catsRes.error) console.error("categories fetch:", catsRes.error.message);
  if (prodsRes.error) console.error("products fetch:", prodsRes.error.message);
  if (promosRes.error) console.error("promos fetch:", promosRes.error.message);
  if (bannersRes.error) console.error("banners fetch:", bannersRes.error.message);
  if (reviewsRes.error) console.error("reviews fetch:", reviewsRes.error.message);

  const categories: PubCategory[] = (catsRes.data ?? []).map((c) => ({
    id: c.id, name: c.name, nameRu: c.name_ru || null, slug: c.slug,
    sortOrder: c.sort_order, showInNav: c.show_in_nav, isActive: c.is_active,
  }));

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

  const banners: Banner[] = ((bannersRes.data ?? []) as { id: string; image_path: string }[])
    .map((b) => ({ id: b.id, image: b.image_path }));

  const stickers: Sticker[] = ((stickersRes.data ?? []) as { id: string; name: string; image_path: string }[])
    .map((s) => ({ id: s.id, name: s.name, image: s.image_path }));

  const gallery: GalleryItem[] = ((galleryRes.data ?? []) as { id: string; image_path: string; author_name: string | null; text: string | null }[])
    .map((g) => ({ id: g.id, image: g.image_path, author: g.author_name ?? "", text: g.text ?? "" }));

  const videos: VideoItem[] = ((videosRes.data ?? []) as { id: string; video_path: string; poster_path: string | null; author_name: string | null; text: string | null }[])
    .map((v) => ({ id: v.id, video: v.video_path, poster: v.poster_path, author: v.author_name ?? "", text: v.text ?? "" }));

  type NewsRow = {
    id: string; text: string | null; image_path: string | null; link: string; posted_at: string | null;
    channel: { username: string; title: string | null; title_auto: string | null }
      | { username: string; title: string | null; title_auto: string | null }[] | null;
  };
  // не більше двох свіжих дописів з кожного каналу — щоб активніший канал не забив блок
  const perChannel = new Map<string, number>();
  const news: NewsPost[] = ((newsRes.data ?? []) as unknown as NewsRow[]).filter((n) => {
    const ch = Array.isArray(n.channel) ? n.channel[0] : n.channel;
    const key = ch?.username ?? "";
    const used = perChannel.get(key) ?? 0;
    if (used >= 2) return false;
    perChannel.set(key, used + 1);
    return true;
  }).map((n) => {
    const ch = Array.isArray(n.channel) ? n.channel[0] : n.channel;
    return {
      id: n.id,
      channel: ch?.title || ch?.title_auto || (ch?.username ? `@${ch.username}` : ""),
      channelUsername: ch?.username ?? "",
      text: n.text ?? "",
      image: n.image_path,
      link: n.link,
      postedAt: n.posted_at,
    };
  });

  const settingsRows = (settingsRes.data ?? []) as { key: string; value: unknown }[];
  const navVis = parseNavVisibility(settingsRows.find((r) => r.key === "nav_specials")?.value);
  const glossary = parseGlossary(settingsRows.find((r) => r.key === "glossary")?.value);
  // підписи спец-пунктів навігації беремо з глосарію
  const navLabel: Record<string, string> = {
    hity: glossary.nav_hity, novynky: glossary.nav_novynky, aktsii: glossary.nav_aktsii,
  };
  const navSpecials = NAV_SPECIALS.filter((sp) => navVis[sp.id]).map((sp) => ({ ...sp, label: navLabel[sp.id] ?? sp.label }));
  const sections: SectionVisibility = parseSections(settingsRows.find((r) => r.key === "sections")?.value);

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
      banners, navSpecials, glossary, stickers, news, gallery, videos, sections,
      reviews: reviews.length ? reviews : demoReviews,
    };
  }

  return { catalog, categories, banners, navSpecials, glossary, reviews, stickers, news, gallery, videos, sections };
}

/**
 * Кешована версія: віддає ті самі дані без походу в БД, поки адмінка не скине
 * тег PUBLIC_TAG (або поки не мине PUBLIC_REVALIDATE як страховка).
 */
export const fetchPublicData = unstable_cache(fetchPublicDataUncached, ["public-data"], {
  tags: [PUBLIC_TAG],
  revalidate: PUBLIC_REVALIDATE,
});
