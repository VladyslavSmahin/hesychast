"use client";

// Публічні дані каталогу (товари / категорії / підкатегорії), завантажені з Supabase
// на сервері (RSC) і передані сюди як value. Хуки повторюють сигнатури колишніх
// localStorage-сторів, щоб публічні компоненти змінювались мінімально.

import { createContext, useContext } from "react";
import type { Product, Banner, NavCategory } from "@/lib/types";
import { GLOSSARY_DEFAULTS, type Glossary } from "@/lib/glossary";

export interface PubCategory {
  id: string;
  name: string;
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
}

const Ctx = createContext<PublicData>({ catalog: [], categories: [], banners: [], navSpecials: [], glossary: GLOSSARY_DEFAULTS, reviews: [] });

export function PublicDataProvider({ value, children }: { value: PublicData; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePublicCatalog(): Product[] {
  return useContext(Ctx).catalog;
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
/** Значення глосарію за ключем (з фолбеком на дефолт). */
export function useGloss(key: string): string {
  return useContext(Ctx).glossary[key] ?? GLOSSARY_DEFAULTS[key] ?? key;
}
