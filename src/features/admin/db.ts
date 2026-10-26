"use client";

// Доступ до каталогу в Supabase для адмінки: хуки читання (з refetch) + мутації.
// Заміна localStorage-сторів. RLS: читання публічне, запис — staff, видалення — admin.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NAV_SPECIALS, parseNavVisibility } from "@/lib/navSpecials";
import { SECTIONS, parseSections, type SectionVisibility } from "@/lib/sections";
import { parseGlossary, type Glossary } from "@/lib/glossary";
import type { Badge, Availability, ProductColor, Sticker, GalleryItem, VideoItem } from "@/lib/types";
import { revalidatePublicAction } from "@/features/admin/actions/revalidatePublic";

// ---------- Типи ----------
export interface DbCategory { id: string; name: string; nameRu: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean; }
export interface DbProduct {
  id: string; categoryId: string | null;
  name: string; nameRu: string; slug: string; price: number; weight: string; weightRu: string; badge: Badge;
  desc: string; descRu: string; photo: string | null;
  /** додаткові фото після головного */
  images: string[];
  availability: Availability; sortOrder: number;
  // опції одягу
  sizes: string[]; colors: ProductColor[];
  stickerOption: boolean; stickerPrice: number; sizeChart: string | null;
  // видимість: сховати з меню / стрічка «Скоро в продажу»
  hiddenInMenu: boolean; comingSoon: boolean;
}
export interface ProductInput {
  categoryId: string | null;
  name: string; nameRu: string; price: number; weight: string; weightRu: string; badge: Badge;
  desc: string; descRu: string; photo: string | null; images: string[]; availability: Availability;
  sizes: string[]; colors: ProductColor[];
  stickerOption: boolean; stickerPrice: number; sizeChart: string | null;
  hiddenInMenu: boolean; comingSoon: boolean;
}

const slugify = (s: string) =>
  (s.toLowerCase().trim().replace(/[^a-z0-9а-яіїєґ]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product") +
  "-" + Math.random().toString(36).slice(2, 7);

// ---------- Рядки select ----------
// Спрощена схема: товар = назва + ціна + опис + вага + бейдж + фото + категорія.
interface ProductRow {
  id: string; category_id: string | null; name: string; name_ru: string | null; slug: string;
  price: number | string; weight: string | null; weight_ru: string | null; badge: string | null;
  description: string | null; description_ru: string | null; image_path: string | null;
  images: string[] | null;
  availability: Availability; sort_order: number;
  sizes: string[] | null; colors: unknown;
  sticker_option: boolean | null; sticker_price: number | string | null; size_chart_image: string | null;
  hidden_in_menu: boolean | null; coming_soon: boolean | null;
}

/** Безпечний парс jsonb-кольорів. */
function parseColors(v: unknown): ProductColor[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is { name?: unknown; hex?: unknown } => !!c && typeof c === "object")
    .map((c) => ({ name: String(c.name ?? ""), hex: String(c.hex ?? "#000000") }))
    .filter((c) => c.name);
}

function mapProduct(p: ProductRow): DbProduct {
  return {
    id: p.id, categoryId: p.category_id,
    name: p.name, nameRu: p.name_ru ?? "", slug: p.slug, price: Number(p.price),
    weight: p.weight ?? "", weightRu: p.weight_ru ?? "",
    badge: (p.badge ?? "") as Badge, desc: p.description ?? "", descRu: p.description_ru ?? "",
    photo: p.image_path ?? null, images: p.images ?? [], availability: p.availability ?? "in_stock", sortOrder: p.sort_order,
    sizes: p.sizes ?? [], colors: parseColors(p.colors),
    stickerOption: Boolean(p.sticker_option), stickerPrice: Number(p.sticker_price ?? 0),
    sizeChart: p.size_chart_image ?? null,
    hiddenInMenu: Boolean(p.hidden_in_menu), comingSoon: Boolean(p.coming_soon),
  };
}

const PRODUCT_SELECT =
  "id, category_id, name, name_ru, slug, price, weight, weight_ru, badge, description, description_ru, image_path, images, availability, sizes, colors, sticker_option, sticker_price, size_chart_image, hidden_in_menu, coming_soon, sort_order";

// ---------- Хуки читання ----------
export function useDbProducts() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).order("sort_order");
    if (error) console.error("products:", error.message);
    else setProducts(((data ?? []) as unknown as ProductRow[]).map(mapProduct));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { products, loading, refetch };
}

export function useDbCategories() {
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("id, name, name_ru, slug, sort_order, show_in_nav, is_active").order("sort_order");
    if (error) console.error("categories:", error.message);
    else setCategories((data ?? []).map((c) => ({ id: c.id, name: c.name, nameRu: c.name_ru ?? "", slug: c.slug, sortOrder: c.sort_order, showInNav: c.show_in_nav, isActive: c.is_active })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { categories, loading, refetch };
}

// ---------- Мутації ----------
function productFields(input: ProductInput) {
  return {
    category_id: input.categoryId,
    name: input.name, name_ru: input.nameRu || null,
    description: input.desc || null, description_ru: input.descRu || null,
    price: input.price, weight: input.weight || null, weight_ru: input.weightRu || null,
    badge: input.badge || null, image_path: input.photo, images: input.images, availability: input.availability,
    sizes: input.sizes, colors: input.colors,
    sticker_option: input.stickerOption, sticker_price: input.stickerPrice,
    size_chart_image: input.sizeChart,
    hidden_in_menu: input.hiddenInMenu, coming_soon: input.comingSoon,
  };
}

/** Повертає текст помилки або undefined при успіху. */
export async function dbCreateProduct(input: ProductInput): Promise<string | undefined> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .insert({ ...productFields(input), slug: slugify(input.name), sort_order: 9999 });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

export async function dbUpdateProduct(id: string, input: ProductInput): Promise<string | undefined> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update(productFields(input)).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

/** Змінює статус наявності товару (in_stock / preorder / out_of_stock). */
export async function dbSetAvailability(id: string, value: Availability) {
  await createClient().from("products").update({ availability: value }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
// Спрощена схема без «кошика» (soft-delete): видалення одразу фізичне.
export async function dbSoftDelete(id: string) {
  await createClient().from("products").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
// ---------- Наклейки (бібліотека принтів для одягу) ----------
export interface DbSticker extends Sticker { isActive: boolean; sortOrder: number }

export function useDbStickers() {
  const supabase = useMemo(() => createClient(), []);
  const [stickers, setStickers] = useState<DbSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("stickers").select("id, name, image_path, is_active, sort_order").order("sort_order");
    if (error) console.error("stickers:", error.message);
    else setStickers((data ?? []).map((s) => ({
      id: s.id, name: s.name, image: s.image_path, isActive: s.is_active, sortOrder: s.sort_order,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { stickers, loading, refetch };
}

export async function dbCreateSticker(name: string, image: string): Promise<string | undefined> {
  const { error } = await createClient().from("stickers").insert({ name, image_path: image, sort_order: 9999 });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

export async function dbUpdateSticker(id: string, patch: Partial<{ name: string; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  await createClient().from("stickers").update(row).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

export async function dbDeleteSticker(id: string) {
  await createClient().from("stickers").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Галерея клієнтів (фото + відгуки) ----------
export interface DbGalleryItem extends GalleryItem { isActive: boolean; sortOrder: number }

export function useDbGallery() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<DbGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("gallery_items").select("id, image_path, author_name, text, is_active, sort_order").order("sort_order");
    if (error) console.error("gallery:", error.message);
    else setItems((data ?? []).map((g) => ({
      id: g.id, image: g.image_path, author: g.author_name ?? "", text: g.text ?? "",
      isActive: g.is_active, sortOrder: g.sort_order,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { items, loading, refetch };
}

export async function dbCreateGalleryItem(image: string): Promise<string | undefined> {
  const { error } = await createClient().from("gallery_items").insert({ image_path: image, sort_order: 9999 });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

export async function dbUpdateGalleryItem(id: string, patch: Partial<{ author: string; text: string; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.author !== undefined) row.author_name = patch.author || null;
  if (patch.text !== undefined) row.text = patch.text || null;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  await createClient().from("gallery_items").update(row).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

export async function dbDeleteGalleryItem(id: string) {
  await createClient().from("gallery_items").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Відео клієнтів ----------
export interface DbVideoItem extends VideoItem { isActive: boolean; sortOrder: number }

export function useDbVideos() {
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<DbVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("video_items").select("id, video_path, poster_path, author_name, text, is_active, sort_order").order("sort_order");
    if (error) console.error("videos:", error.message);
    else setVideos((data ?? []).map((v) => ({
      id: v.id, video: v.video_path, poster: v.poster_path, author: v.author_name ?? "", text: v.text ?? "",
      isActive: v.is_active, sortOrder: v.sort_order,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { videos, loading, refetch };
}

/**
 * Завантажує відео напряму в Storage за підписаним посиланням (через сервер
 * не можна — ліміт тіла запиту 4.5 МБ) і створює запис у video_items.
 */
export async function dbUploadVideo(file: File, poster: File | null): Promise<string | undefined> {
  const signRes = await fetch("/api/video-upload", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !sign.ok) return sign.error || `HTTP ${signRes.status}`;

  const supabase = createClient();
  const { error: upErr } = await supabase.storage.from("media").uploadToSignedUrl(sign.path, sign.token, file);
  if (upErr) return upErr.message;

  // постер (перший кадр) — звичайним шляхом через /api/upload
  let posterUrl: string | null = null;
  if (poster) {
    const r = await dbUploadImage(poster, "products");
    posterUrl = r.url ?? null;
  }

  const { error } = await supabase.from("video_items").insert({
    video_path: sign.publicUrl, poster_path: posterUrl, sort_order: 9999,
  });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

export async function dbUpdateVideo(id: string, patch: Partial<{ author: string; text: string; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.author !== undefined) row.author_name = patch.author || null;
  if (patch.text !== undefined) row.text = patch.text || null;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  await createClient().from("video_items").update(row).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

export async function dbDeleteVideo(id: string) {
  await createClient().from("video_items").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Telegram-канали (блок новин на сайті) ----------
export interface DbTgChannel {
  id: string; username: string;
  /** ручний підпис (може бути порожній) */
  title: string;
  /** назва каналу з Telegram */
  titleAuto: string;
  isActive: boolean; sortOrder: number;
  lastSyncAt: string | null; postCount: number;
}

export function useDbTgChannels() {
  const supabase = useMemo(() => createClient(), []);
  const [channels, setChannels] = useState<DbTgChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("tg_channels")
      .select("id, username, title, title_auto, is_active, sort_order, last_sync_at, posts:tg_posts(count)")
      .order("sort_order");
    if (error) console.error("tg_channels:", error.message);
    else setChannels((data ?? []).map((c) => ({
      id: c.id, username: c.username, title: c.title ?? "", titleAuto: c.title_auto ?? "", isActive: c.is_active, sortOrder: c.sort_order,
      lastSyncAt: c.last_sync_at,
      postCount: (c.posts as { count: number }[] | null)?.[0]?.count ?? 0,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { channels, loading, refetch };
}

export async function dbCreateTgChannel(username: string, title: string): Promise<string | undefined> {
  const { error } = await createClient().from("tg_channels").insert({
    username: username.replace(/^@/, "").trim(), title: title.trim() || null, sort_order: 9999,
  });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}

export async function dbUpdateTgChannel(id: string, patch: Partial<{ title: string; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title || null;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  await createClient().from("tg_channels").update(row).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

export async function dbDeleteTgChannel(id: string) {
  await createClient().from("tg_channels").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

/** Ручний запуск синхронізації новин (те саме, що робить крон кожні 5 годин). */
export async function dbSyncTgNews(): Promise<{ ok: boolean; error?: string; channels?: { username: string; fetched: number; error?: string }[] }> {
  const res = await fetch("/api/cron/tg-news");
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) return { ok: false, error: j.error || `HTTP ${res.status}` };
  return { ok: true, channels: j.channels };
}

// ---------- Категорії CRUD ----------
export interface CategoryInput { name: string; nameRu?: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean; }
export async function dbCreateCategory(input: CategoryInput): Promise<string | undefined> {
  const { error } = await createClient().from("categories").insert({
    name: input.name, name_ru: input.nameRu || null, slug: input.slug,
    sort_order: input.sortOrder, show_in_nav: input.showInNav, is_active: input.isActive,
  });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
export async function dbUpdateCategory(id: string, patch: Partial<{ name: string; nameRu: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.nameRu !== undefined) row.name_ru = patch.nameRu || null;
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.showInNav !== undefined) row.show_in_nav = patch.showInNav;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  await createClient().from("categories").update(row).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
export async function dbDeleteCategory(id: string) {
  await createClient().from("categories").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Акції ----------
export interface DbPromo {
  id: string; productId: string | null;
  price: number; oldPrice: number; isActive: boolean; sortOrder: number;
  validFrom: string | null; validUntil: string | null; // дати у форматі YYYY-MM-DD (для інпутів)
}
export interface PromoInput {
  productId: string | null;
  price: number; oldPrice: number; isActive: boolean;
  validFrom: string | null; validUntil: string | null;
}

export function useDbPromos() {
  const supabase = useMemo(() => createClient(), []);
  const [promos, setPromos] = useState<DbPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promos")
      .select("id, product_id, promo_price, is_active, sort_order, valid_from, valid_until")
      .order("sort_order");
    if (error) console.error("promos:", error.message);
    else setPromos((data ?? []).map((p) => ({
      id: p.id, productId: p.product_id,
      price: Number(p.promo_price), oldPrice: 0,
      isActive: p.is_active, sortOrder: p.sort_order,
      validFrom: p.valid_from ? String(p.valid_from).slice(0, 10) : null,
      validUntil: p.valid_until ? String(p.valid_until).slice(0, 10) : null,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { promos, loading, refetch };
}

function promoFields(input: PromoInput) {
  return {
    product_id: input.productId,
    promo_price: input.price,
    is_active: input.isActive,
    // дату-початок беремо як 00:00, дату-кінець — як кінець доби, щоб акція діяла весь день
    valid_from: input.validFrom ? `${input.validFrom}T00:00:00` : null,
    valid_until: input.validUntil ? `${input.validUntil}T23:59:59` : null,
  };
}
export async function dbCreatePromo(input: PromoInput): Promise<string | undefined> {
  const { error } = await createClient().from("promos").insert({ ...promoFields(input), sort_order: 9999 });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
export async function dbUpdatePromo(id: string, input: PromoInput): Promise<string | undefined> {
  const { error } = await createClient().from("promos").update(promoFields(input)).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
export async function dbSetPromoActive(id: string, value: boolean) {
  await createClient().from("promos").update({ is_active: value }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
export async function dbDeletePromo(id: string) {
  await createClient().from("promos").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Банери (Hero-слайдер) ----------
export interface DbBanner { id: string; imagePath: string; isActive: boolean; sortOrder: number; }

export function useDbBanners() {
  const supabase = useMemo(() => createClient(), []);
  const [banners, setBanners] = useState<DbBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("id, image_path, is_active, sort_order")
      .order("sort_order");
    if (error) console.error("banners:", error.message);
    else setBanners((data ?? []).map((b) => ({ id: b.id, imagePath: b.image_path, isActive: b.is_active, sortOrder: b.sort_order })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { banners, loading, refetch };
}

/** Завантажує зображення через API (конвертація у WebP + R2). Повертає публічний URL або помилку. */
export async function dbUploadImage(file: File, folder = "products"): Promise<{ url?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.url) return { error: j.error || `HTTP ${res.status}` };
  return { url: j.url };
}

/** Завантажує файл банера через API (конвертація у WebP + R2). Повертає текст помилки або undefined. */
export async function dbUploadBanner(file: File): Promise<string | undefined> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/banners", { method: "POST", body: fd });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return j.error || `HTTP ${res.status}`;
  }
  return undefined;
}

export async function dbDeleteBanner(id: string): Promise<string | undefined> {
  const res = await fetch("/api/banners", {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return j.error || `HTTP ${res.status}`;
  }
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return undefined;
}

export async function dbSetBannerActive(id: string, value: boolean) {
  await createClient().from("banners").update({ is_active: value }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

/** Перезаписує порядок банерів: sort_order = індекс у переданому масиві id. */
export async function dbReorderBanners(ids: string[]) {
  const supabase = createClient();
  await Promise.all(ids.map((id, i) => supabase.from("banners").update({ sort_order: i }).eq("id", id)));
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Замовлення ----------
export type OrderStatus = "new" | "confirmed" | "done" | "canceled";

/** Перевізник замовлення (самовивозу немає — крамниця відправляє поштою). */
export type Carrier = "nova_poshta" | "ukrposhta" | "other";
export const CARRIER_LABEL: Record<Carrier, string> = {
  nova_poshta: "Нова Пошта",
  ukrposhta: "Укрпошта",
  other: "Інше",
};
export interface DbOrderOptions { size?: string; color?: string; sticker?: string; stickerPrice?: number }
export interface DbOrderItem { name: string; price: number; quantity: number; options?: DbOrderOptions | null }

/** Вибрані опції позиції одним рядком («L · Чорний · наклейка «Хрест»»). */
export function orderItemOptions(it: DbOrderItem): string {
  const o = it.options;
  if (!o) return "";
  const parts = [o.size, o.color].filter(Boolean) as string[];
  if (o.sticker) parts.push(`наклейка «${o.sticker}»`);
  return parts.join(" · ");
}
export interface DbOrder {
  id: string; customerName: string; phone: string; deliveryType: Carrier;
  address: string | null; comment: string | null; status: OrderStatus;
  subtotal: number; total: number;
  createdAt: string; items: DbOrderItem[];
}

export function useDbOrders() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, phone, delivery_type, address, comment, status, subtotal, total, created_at, items:order_items(product_name, price, quantity, options)")
      .order("created_at", { ascending: false });
    if (error) console.error("orders:", error.message);
    else setOrders((data ?? []).map((o) => ({
      id: o.id, customerName: o.customer_name, phone: o.phone, deliveryType: o.delivery_type as Carrier,
      address: o.address, comment: o.comment, status: o.status as OrderStatus,
      subtotal: Number(o.subtotal), total: Number(o.total),
      createdAt: o.created_at,
      items: ((o.items ?? []) as { product_name: string; price: number; quantity: number; options: DbOrderOptions | null }[])
        .map((it) => ({ name: it.product_name, price: Number(it.price), quantity: it.quantity, options: it.options })),
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { orders, loading, refetch };
}

export async function dbSetOrderStatus(id: string, status: OrderStatus) {
  await createClient().from("orders").update({ status }).eq("id", id);
}

// ---------- Відгуки ----------
export type ReviewStatus = "pending" | "approved" | "rejected";
export interface DbReview {
  id: string; authorName: string; contact: string; rating: number | null; text: string;
  status: ReviewStatus; createdAt: string;
}

export function useDbReviews() {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("id, author_name, contact, rating, text, status, created_at")
      .order("created_at", { ascending: false });
    if (error) console.error("reviews:", error.message);
    else setReviews((data ?? []).map((r) => ({
      id: r.id, authorName: r.author_name, contact: r.contact, rating: r.rating, text: r.text,
      status: r.status as ReviewStatus, createdAt: r.created_at,
    })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { reviews, loading, refetch };
}

export async function dbSetReviewStatus(id: string, status: ReviewStatus) {
  await createClient().from("reviews").update({ status }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
export async function dbDeleteReview(id: string) {
  await createClient().from("reviews").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Спец-пункти навігації (Новинки / Акції) ----------
export interface NavSpecialItem { id: string; label: string; showInNav: boolean; }

export function useDbNavSpecials() {
  const supabase = useMemo(() => createClient(), []);
  const [specials, setSpecials] = useState<NavSpecialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("settings").select("value").eq("key", "nav_specials").maybeSingle();
    if (error) console.error("nav_specials:", error.message);
    const vis = parseNavVisibility(data?.value);
    setSpecials(NAV_SPECIALS.map((sp) => ({ id: sp.id, label: sp.label, showInNav: vis[sp.id] })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { specials, loading, refetch };
}

/** Перемкнути видимість одного спец-пункту (інші лишаються як були). */
export async function dbSetNavSpecialVisible(specials: NavSpecialItem[], id: string, visible: boolean) {
  const map: Record<string, boolean> = {};
  for (const sp of specials) map[sp.id] = sp.id === id ? visible : sp.showInNav;
  await createClient().from("settings").upsert({ key: "nav_specials", value: map }, { onConflict: "key" });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Блоки сайту (settings, key='sections') ----------
export interface SectionItem { id: string; label: string; hint?: string; visible: boolean }

export function useDbSections() {
  const supabase = useMemo(() => createClient(), []);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("settings").select("value").eq("key", "sections").maybeSingle();
    if (error) console.error("sections:", error.message);
    const vis: SectionVisibility = parseSections(data?.value);
    setSections(SECTIONS.map((s) => ({ id: s.id, label: s.label, hint: s.hint, visible: vis[s.id] })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { sections, loading, refetch };
}

/** Вмикає/вимикає один блок головної (решта лишаються як були). */
export async function dbSetSectionVisible(sections: SectionItem[], id: string, visible: boolean) {
  const map: Record<string, boolean> = {};
  for (const s of sections) map[s.id] = s.id === id ? visible : s.visible;
  await createClient().from("settings").upsert({ key: "sections", value: map }, { onConflict: "key" });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}

// ---------- Глосарій (settings, key='glossary') ----------
export function useDbGlossary() {
  const supabase = useMemo(() => createClient(), []);
  const [glossary, setGlossary] = useState<Glossary>(parseGlossary(null));
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("settings").select("value").eq("key", "glossary").maybeSingle();
    if (error) console.error("glossary:", error.message);
    setGlossary(parseGlossary(data?.value));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { glossary, loading, refetch };
}

export async function dbSaveGlossary(glossary: Glossary): Promise<string | undefined> {
  const { error } = await createClient().from("settings").upsert({ key: "glossary", value: glossary }, { onConflict: "key" });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
