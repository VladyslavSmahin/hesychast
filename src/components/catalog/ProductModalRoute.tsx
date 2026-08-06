"use client";

import { useRouter } from "next/navigation";
import ProductModal from "@/components/ProductModal";
import { useCart } from "@/features/cart/CartContext";
import type { Product } from "@/lib/types";

// Обгортка модалки для перехопленого маршруту /tovar/<slug>.
// Закриття — це крок назад в історії, тож URL повертається до каталогу.
export default function ProductModalRoute({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();

  return <ProductModal item={product} onClose={() => router.back()} onAdd={add} />;
}
