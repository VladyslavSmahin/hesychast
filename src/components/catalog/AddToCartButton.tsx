"use client";

import { useState } from "react";
import { useCart } from "@/features/cart/CartContext";
import ProductOptions, { hasOptions, optionsReady } from "@/components/ProductOptions";
import { useProductOptions } from "@/components/ProductOptionsContext";
import { useT } from "@/features/locale/LocaleContext";
import { isSoon } from "@/lib/types";

// Селектори опцій + кнопка «Додати в кошик» для серверної сторінки товару.
// Обраний розмір/колір/наклейка лежать у ProductOptionsProvider — те саме
// значення читає прев'ю наклейки під головним фото.
export default function AddToCartButton() {
  const { product, options } = useProductOptions();
  const { add } = useCart();
  const t = useT();
  const [added, setAdded] = useState(false);

  const soon = isSoon(product);                 // без ціни або «Скоро в продажу»
  const ready = optionsReady(product, options) && !soon;

  const handleAdd = () => {
    if (!ready) return;
    add(product, undefined, hasOptions(product) ? options : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const extra = options.sticker ? product.stickerPrice : 0;

  return (
    <>
      <ProductOptions />
      <button
        className="btn-primary"
        style={{ width: "100%", transition: "all 0.2s", opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
        onClick={handleAdd}
        disabled={!ready}
      >
        {soon
          ? t("catalog.soon")
          : added
            ? `\u2713 ${t("cart.added")}`
            : !ready
              ? t("opt.chooseFirst")
              : extra
                ? `${t("cart.add")} — ${product.price + extra} ${t("catalog.uah")}`
                : t("cart.add")}
      </button>
    </>
  );
}
