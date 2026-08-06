"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/CartContext";
import type { Product } from "@/lib/types";

// Кнопка «Додати в кошик» для серверної сторінки товару.
// Після додавання коротко показує підтвердження — щоб дія не була «мовчазною».
export default function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <button
      className="btn-primary"
      style={{ width: "100%", transition: "all 0.2s" }}
      onClick={handleAdd}
    >
      {added ? "✓ Додано в кошик" : "Додати в кошик"}
    </button>
  );
}
