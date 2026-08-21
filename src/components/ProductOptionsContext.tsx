"use client";

// Вибрані опції товару (розмір/колір/наклейка) живуть тут, бо їх показують
// одразу два місця: селектори праворуч і прев'ю наклейки під головним фото.

import { createContext, useContext, useEffect, useState } from "react";
import { usePublicStickers } from "@/features/publicData";
import type { CartOptions, Product, Sticker } from "@/lib/types";

interface Value {
  product: Product;
  options: CartOptions;
  setOptions: (v: CartOptions) => void;
  /** наклейки, передані сторінкою; null — беремо з PublicDataProvider */
  stickers: Sticker[] | null;
}

const Ctx = createContext<Value | null>(null);

export function ProductOptionsProvider({
  product,
  stickers = null,
  children,
}: {
  product: Product;
  stickers?: Sticker[] | null;
  children: React.ReactNode;
}) {
  const [options, setOptions] = useState<CartOptions>({});

  // інший товар — скидаємо вибір
  useEffect(() => { setOptions({}); }, [product.id]);

  return <Ctx.Provider value={{ product, options, setOptions, stickers }}>{children}</Ctx.Provider>;
}

export function useProductOptions(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProductOptions must be used within ProductOptionsProvider");
  return ctx;
}

/** Список наклейок: із пропа сторінки товару або з публічних даних головної. */
export function useStickerLibrary(): Sticker[] {
  const { stickers } = useProductOptions();
  const fromPublicData = usePublicStickers();
  return stickers ?? fromPublicData;
}
