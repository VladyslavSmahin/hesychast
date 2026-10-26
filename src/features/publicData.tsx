"use client";

// Публічні дані каталогу (товари / категорії / підкатегорії), завантажені з Supabase
// на сервері (RSC) і передані сюди як value. Хуки повторюють сигнатури колишніх
// localStorage-сторів, щоб публічні компоненти змінювались мінімально.

import { createContext, useContext, useMemo } from "react";
import type { Product, Banner, NavCategory, Sticker, NewsPost, GalleryItem, VideoItem } from "@/lib/types";
import { GLOSSARY_DEFAULTS, type Glossary } from "@/lib/glossary";
import { SECTIONS_DEFAULT, type SectionVisibility } from "@/lib/sections";
import { useLocale } from "@/features/locale/LocaleContext";

export interface PubCategory {
  id: string;
  name: string;
  nameRu?: string | null;
  slug: string;
  sortOrder: number;
  showInNav: boolean;
  isActive: boolean;
}

export interface PubReview {
  id: string;
  authorName: string;
  rating: number | null;
  text: string;
  createdAt: string;
}

export interface PublicData {
  catalog: Product[];
  categories: PubCategory[];
  banners: Banner[];
  navSpecials: NavCategory[];
  glossary: Glossary;
  reviews: PubReview[];
  /** бібліотека наклейок для одягу */
  stickers: Sticker[];
  /** останні пости з Telegram-каналів */
  news: NewsPost[];
  /** фото клієнтів (з відгуками або без) */
  gallery: GalleryItem[];
  /** відео клієнтів */
  videos: VideoItem[];
  /** які блоки головної показувати (керується в адмінці) */
  sections: SectionVisibility;
}

const Ctx = createContext<PublicData>({ catalog: [], categories: [], banners: [], navSpecials: [], glossary: GLOSSARY_DEFAULTS, reviews: [], stickers: [], news: [], gallery: [], videos: [], sections: SECTIONS_DEFAULT });

export function PublicDataProvider({ value, children }: { value: PublicData; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Товари каталогу (меню, новинки, кошик) — без прихованих з меню. */
export function usePublicCatalog(): Product[] {
  const catalog = useContext(Ctx).catalog;
  return useMemo(() => catalog.filter((p) => !p.hiddenInMenu), [catalog]);
}

/** Стрічка «Скоро в продажу» — незалежно від того, чи товар прихований з меню. */
export function usePublicComingSoon(): Product[] {
  const catalog = useContext(Ctx).catalog;
  return useMemo(() => catalog.filter((p) => p.comingSoon), [catalog]);
}

export function usePublicCategories(opts?: { navOnly?: boolean }): PubCategory[] {
  const cats = useContext(Ctx).categories;
  return opts?.navOnly ? cats.filter((c) => c.isActive && c.showInNav) : cats;
}

export function usePublicBanners(): Banner[] {
  return useContext(Ctx).banners;
}

export function usePublicNavSpecials(): NavCategory[] {
  return useContext(Ctx).navSpecials;
}


export function usePublicReviews(): PubReview[] {
  return useContext(Ctx).reviews;
}

export function usePublicStickers(): Sticker[] {
  return useContext(Ctx).stickers;
}

export function usePublicNews(): NewsPost[] {
  return useContext(Ctx).news;
}

export function usePublicGallery(): GalleryItem[] {
  return useContext(Ctx).gallery;
}

export function usePublicVideos(): VideoItem[] {
  return useContext(Ctx).videos;
}

/** Назва товару/категорії поточною мовою (порожня російська → українська). */
export function useLocalized() {
  const { locale } = useLocale();
  return {
    productName: (p: { name: string; nameRu?: string | null }) => (locale === "ru" && p.nameRu) || p.name,
    productDesc: (p: { desc: string; descRu?: string | null }) => (locale === "ru" && p.descRu) || p.desc,
    productWeight: (p: { weight: string; weightRu?: string | null }) => (locale === "ru" && p.weightRu) || p.weight,
    categoryName: (c: { name: string; nameRu?: string | null }) => (locale === "ru" && c.nameRu) || c.name,
  };
}

/** Чи показувати блок головної (вимикається в адмінці). */
export function useSectionOn(id: string): boolean {
  return useContext(Ctx).sections[id] !== false;
}
/**
 * Значення глосарію за ключем з урахуванням мови: для російської спершу
 * пробуємо «<ключ>_ru» (редагується в адмінці), інакше — українське значення.
 */
export function useGloss(key: string): string {
  const glossary = useContext(Ctx).glossary;
  const { locale } = useLocale();
  const pick = (k: string) => glossary[k] ?? GLOSSARY_DEFAULTS[k];
  if (locale === "ru") {
    const ru = pick(`${key}_ru`);
    if (ru) return ru;
  }
  return pick(key) ?? key;
}
