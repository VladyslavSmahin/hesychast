"use client";

// Доступ до каталогу в Supabase для адмінки: хуки читання (з refetch) + мутації.
// Заміна localStorage-сторів. RLS: читання публічне, запис — staff, видалення — admin.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseDeliverySettings, DEFAULT_DELIVERY, type DeliverySettings } from "@/lib/delivery";
import { NAV_SPECIALS, parseNavVisibility } from "@/lib/navSpecials";
import { parseGlossary, type Glossary } from "@/lib/glossary";
import type { Badge } from "@/lib/types";
import { revalidatePublicAction } from "@/features/admin/actions/revalidatePublic";

// ---------- Типи ----------
export interface DbIngredient {
  id: string; name: string; slug: string;
  kcal: number | null; protein: number | null; fat: number | null; carbs: number | null;
}
export interface DbCategory { id: string; name: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean; }
export interface DbSubcategory { id: string; categoryId: string; name: string; slug: string; sortOrder: number; }
export interface DbProduct {
  id: string; categoryId: string | null; subcategoryId: string | null;
  name: string; slug: string; price: number; weight: string; pieces: string; badge: Badge;
  desc: string; composition: string; fullDesc: string; photo: string | null;
  isAvailable: boolean; deletedAt: string | null; sortOrder: number;
  ingredientIds: string[]; ingredientGrams: Record<string, number>;
  setItemIds: string[]; // для сетів: id товарів-ролів у складі
}
export interface ProductInput {
  categoryId: string | null; subcategoryId: string | null;
  name: string; price: number; weight: string; pieces: string; badge: Badge;
  desc: string; composition: string; fullDesc: string; photo: string | null;
  isAvailable: boolean; ingredientIds: string[]; ingredientGrams: Record<string, number>;
  setItemIds: string[];
}

const slugify = (s: string) =>
  (s.toLowerCase().trim().replace(/[^a-z0-9а-яіїєґ]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product") +
  "-" + Math.random().toString(36).slice(2, 7);

// ---------- Рядки select ----------
// Спрощена схема: товар = назва + ціна + опис + вага + бейдж + фото + категорія.
interface ProductRow {
  id: string; category_id: string | null; name: string; slug: string;
  price: number | string; weight: string | null; badge: string | null;
  description: string | null; image_path: string | null;
  is_available: boolean; sort_order: number;
}

function mapProduct(p: ProductRow): DbProduct {
  return {
    id: p.id, categoryId: p.category_id, subcategoryId: null,
    name: p.name, slug: p.slug, price: Number(p.price), weight: p.weight ?? "", pieces: "",
    badge: (p.badge ?? "") as Badge, desc: p.description ?? "", composition: "",
    fullDesc: p.description ?? "", photo: p.image_path ?? null, isAvailable: p.is_available,
    deletedAt: null, sortOrder: p.sort_order,
    ingredientIds: [], ingredientGrams: {},
    setItemIds: [],
  };
}

const PRODUCT_SELECT =
  "id, category_id, name, slug, price, weight, badge, description, image_path, is_available, sort_order";

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

export function useDbIngredients() {
  const supabase = useMemo(() => createClient(), []);
  const [ingredients, setIngredients] = useState<DbIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("ingredients").select("id, name, slug, kcal, protein, fat, carbs").order("name");
    if (error) console.error("ingredients:", error.message);
    else setIngredients((data ?? []) as DbIngredient[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { ingredients, loading, refetch };
}

export function useDbCategories() {
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("id, name, slug, sort_order, show_in_nav, is_active").order("sort_order");
    if (error) console.error("categories:", error.message);
    else setCategories((data ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order, showInNav: c.show_in_nav, isActive: c.is_active })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { categories, loading, refetch };
}

export function useDbSubcategories() {
  const supabase = useMemo(() => createClient(), []);
  const [subcategories, setSubcategories] = useState<DbSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("subcategories").select("id, category_id, name, slug, sort_order").order("sort_order");
    if (error) console.error("subcategories:", error.message);
    else setSubcategories((data ?? []).map((s) => ({ id: s.id, categoryId: s.category_id, name: s.name, slug: s.slug, sortOrder: s.sort_order })));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { subcategories, loading, refetch };
}

// ---------- Мутації ----------
function productFields(input: ProductInput) {
  return {
    category_id: input.categoryId,
    name: input.name, description: input.desc || null,
    price: input.price, weight: input.weight || null,
    badge: input.badge || null, image_path: input.photo, is_available: input.isAvailable,
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

/** Повертає текст помилки або undefined при успіху. */
export async function dbUpdatePrice(id: string, price: number): Promise<string | undefined> {
  const { error } = await createClient().from("products").update({ price }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
export async function dbSetAvailable(id: string, value: boolean) {
  await createClient().from("products").update({ is_available: value }).eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
// Спрощена схема без «кошика» (soft-delete): видалення одразу фізичне.
export async function dbSoftDelete(id: string) {
  await createClient().from("products").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
export async function dbRestore(id: string) {
  // немає soft-delete — заглушка для сумісності зі старими екранами
}
export async function dbHardDelete(id: string) {
  await createClient().from("products").delete().eq("id", id);
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
}
export async function dbPurgeExpired() {
  // немає soft-delete — нічого прибирати
}

// ---------- Інгредієнти CRUD ----------
type Nutrition = { kcal?: number | null; protein?: number | null; fat?: number | null; carbs?: number | null };

/** Створити інгредієнт. nutrition — опційне КБЖУ на 100 г. */
export async function dbCreateIngredient(name: string, nutrition?: Nutrition): Promise<DbIngredient | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .insert({ name, slug: slugify(name), ...nutrition })
    .select("id, name, slug, kcal, protein, fat, carbs").single();
  if (error || !data) { console.error("ingredient create:", error?.message); return undefined; }
  return data as DbIngredient;
}

export async function dbUpdateIngredient(id: string, patch: Partial<{ name: string } & Nutrition>) {
  await createClient().from("ingredients").update(patch).eq("id", id);
}
export async function dbDeleteIngredient(id: string) {
  // product_ingredients чистяться каскадом (FK on delete cascade)
  await createClient().from("ingredients").delete().eq("id", id);
}

// ---------- Категорії CRUD ----------
export interface CategoryInput { name: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean; }
export async function dbCreateCategory(input: CategoryInput): Promise<string | undefined> {
  const { error } = await createClient().from("categories").insert({
    name: input.name, slug: input.slug, sort_order: input.sortOrder, show_in_nav: input.showInNav, is_active: input.isActive,
  });
  await revalidatePublicAction(); // зміна видна на вітрині — скидаємо її кеш
  return error?.message;
}
export async function dbUpdateCategory(id: string, patch: Partial<{ name: string; slug: string; sortOrder: number; showInNav: boolean; isActive: boolean }>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
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

// ---------- Підкатегорії CRUD ----------
export async function dbCreateSubcategory(input: { categoryId: string; name: string; sortOrder: number }): Promise<string | undefined> {
  const { error } = await createClient().from("subcategories").insert({
    category_id: input.categoryId, name: input.name, slug: slugify(input.name), sort_order: input.sortOrder,
  });
  return error?.message;
}
export async function dbUpdateSubcategory(id: string, patch: Partial<{ name: string; sortOrder: number; categoryId: string }>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  await createClient().from("subcategories").update(row).eq("id", id);
}
export async function dbDeleteSubcategory(id: string) {
  await createClient().from("subcategories").delete().eq("id", id);
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
export interface DbOrderItem { name: string; price: number; quantity: number; }
export interface DbOrder {
  id: string; customerName: string; phone: string; deliveryType: "delivery" | "pickup";
  address: string | null; comment: string | null; status: OrderStatus;
  subtotal: number; deliveryCost: number; total: number;
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
      .select("id, customer_name, phone, delivery_type, address, comment, status, subtotal, delivery_cost, total, created_at, items:order_items(product_name, price, quantity)")
      .order("created_at", { ascending: false });
    if (error) console.error("orders:", error.message);
    else setOrders((data ?? []).map((o) => ({
      id: o.id, customerName: o.customer_name, phone: o.phone, deliveryType: o.delivery_type as "delivery" | "pickup",
      address: o.address, comment: o.comment, status: o.status as OrderStatus,
      subtotal: Number(o.subtotal), deliveryCost: Number(o.delivery_cost), total: Number(o.total),
      createdAt: o.created_at,
      items: ((o.items ?? []) as { product_name: string; price: number; quantity: number }[])
        .map((it) => ({ name: it.product_name, price: Number(it.price), quantity: it.quantity })),
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

// ---------- Налаштування доставки (settings, key='delivery') ----------
export function useDbDelivery() {
  const supabase = useMemo(() => createClient(), []);
  const [delivery, setDelivery] = useState<DeliverySettings>(DEFAULT_DELIVERY);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("settings").select("value").eq("key", "delivery").maybeSingle();
    if (error) console.error("delivery settings:", error.message);
    else setDelivery(parseDeliverySettings(data?.value));
    setLoading(false);
  }, [supabase]);
  useEffect(() => { refetch(); }, [refetch]);
  return { delivery, loading, refetch };
}

export async function dbSaveDelivery(settings: DeliverySettings): Promise<string | undefined> {
  const { error } = await createClient().from("settings").upsert({ key: "delivery", value: settings }, { onConflict: "key" });
  return error?.message;
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
