"use client";

import { useState } from "react";
import CartDrawer from "@/components/CartDrawer";
import { Icon } from "@/components/icons";
import { useCart } from "@/features/cart/CartContext";

// Кнопка кошика + сам кошик для сторінок поза головною (товар, категорія).
// На головній цю роль виконує Header, тут — самодостатній віджет.
export default function CartHost() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Кошик"
        style={{
          position: "relative", width: 40, height: 40, background: "transparent",
          border: "1px solid var(--border-light)", color: "var(--text-primary)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon.Cart width="17" height="17" />
        {count > 0 && (
          <span
            style={{
              position: "absolute", top: -7, right: -7, minWidth: 19, height: 19, padding: "0 5px",
              background: "var(--accent)", color: "#0A0908", borderRadius: 10,
              fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {count}
          </span>
        )}
      </button>
      <CartDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
