"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem, CartOptions, Product } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  /** додати товар; price можна перевизначити (напр. акційна ціна), options — розмір/колір/наклейка */
  add: (product: Product, priceOverride?: number, options?: CartOptions) => void;
  changeQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/**
 * Ключ рядка кошика: товар + вибрані опції. Дві футболки різних кольорів —
 * два окремі рядки, однакові — один рядок із кількістю 2.
 */
function lineKey(productId: string, o?: CartOptions): string {
  const parts = [productId, o?.size ?? "", o?.color ?? "", o?.sticker ?? ""];
  return parts.join("|");
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ss_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // відновлення з localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // збереження
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add = useCallback((product: Product, priceOverride?: number, options?: CartOptions) => {
    // доплата за наклейку входить у ціну позиції
    const base = priceOverride ?? product.price;
    const price = base + (options?.stickerPrice ?? 0);
    // стара ціна для закреслення (лише якщо реально є знижка)
    const oldPrice = product.oldPrice != null && product.oldPrice > base
      ? product.oldPrice + (options?.stickerPrice ?? 0)
      : undefined;
    const key = lineKey(product.id, options);
    setItems((prev) => {
      if (prev.some((i) => i.id === key)) {
        return prev.map((i) => (i.id === key ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: key, productId: product.id, name: product.name, price, oldPrice, qty: 1, options }];
    });
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, total, add, changeQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
