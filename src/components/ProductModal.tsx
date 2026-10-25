"use client";

import { useEffect, useState } from "react";
import { useLocalized } from "@/features/publicData";
import { useT } from "@/features/locale/LocaleContext";
import { Icon } from "./icons";
import PhotoGallery from "./PhotoGallery";
import { PreorderNote } from "./PreorderTag";
import ProductOptions, { hasOptions, optionsReady } from "./ProductOptions";
import { ProductOptionsProvider, useProductOptions } from "./ProductOptionsContext";
import StickerPreview from "./StickerPreview";
import type { CartOptions, Product } from "@/lib/types";

export default function ProductModal({
  item,
  onClose,
  onAdd,
}: {
  item: Product | null;
  onClose: () => void;
  onAdd: (item: Product, priceOverride?: number, options?: CartOptions) => void;
}) {
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <ProductOptionsProvider product={item}>
      <ModalBody item={item} onClose={onClose} onAdd={onAdd} />
    </ProductOptionsProvider>
  );
}

function ModalBody({
  item,
  onClose,
  onAdd,
}: {
  item: Product;
  onClose: () => void;
  onAdd: (item: Product, priceOverride?: number, options?: CartOptions) => void;
}) {
  const { options } = useProductOptions();
  const t = useT();
  const { productName, productDesc, productWeight } = useLocalized();
  const ready = optionsReady(item, options);

  return (
    <div
      onClick={onClose}
      className="fade-in"
      style={{
        position: "fixed", inset: 0, background: "var(--overlay-strong)", backdropFilter: "blur(6px)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-pop"
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border-light)",
          width: 900, maxWidth: "100%", maxHeight: "90vh", overflow: "auto",
          display: "grid", gridTemplateColumns: "var(--modal-cols)", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Закрити"
          style={{
            position: "absolute", top: 16, right: 16, width: 36, height: 36, background: "var(--scrim)",
            border: "1px solid var(--border-light)", color: "var(--text-primary)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
          }}
        >
          <Icon.Close width="14" height="14" />
        </button>

        {/* фото — квадрат: висота дорівнює ширині колонки; під ним — обрана наклейка */}
        <div style={{ alignSelf: "start", minWidth: 0 }}>
        <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
          <PhotoGallery arrows h="100%" photos={item.photos} alt={productName(item)} sizes="(max-width: 900px) 100vw, 450px" soon={item.price <= 0} soonLabel={t("catalog.soon")} />
          {item.badge && (
            <div
              style={{
                position: "absolute", top: 20, left: 20, padding: "6px 12px",
                background: item.badge === "НОВЕ" ? "var(--badge-new)" : "var(--accent)",
                color: "var(--on-accent)", fontSize: 11, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
              }}
            >
              {item.badge === "ХІТ" ? "ХІТ ПРОДАЖІВ" : item.badge}
            </div>
          )}
        </div>
        <div style={{ padding: "0 16px 16px" }}><StickerPreview /></div>
        </div>

        <div style={{ padding: "var(--modal-body-pt, 22px) 32px 28px", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginTop: 12, marginBottom: 10 }}>
            {productName(item)}
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              {productWeight(item)}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: item.oldPrice ? "var(--accent)" : "var(--text-primary)", lineHeight: 1, whiteSpace: "nowrap" }}>
              {item.oldPrice && <span style={{ fontSize: 17, fontWeight: 400, color: "var(--text-secondary)", textDecoration: "line-through", marginRight: 8 }}>{item.oldPrice}</span>}
              {item.price} <span style={{ fontSize: 15, fontWeight: 400 }}>грн</span>
            </span>
          </div>

          {item.desc && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>{t("catalog.desc")}</div>
              <p style={{ fontSize: 15, fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.6, opacity: 0.9 }}>
                {productDesc(item)}
              </p>
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            {item.availability === "preorder" && <PreorderNote />}
            <ProductOptions />
            <button
              className="btn-primary"
              style={{ width: "100%", opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
              disabled={!ready || item.price <= 0}
              onClick={() => { if (!ready || item.price <= 0) return; onAdd(item, undefined, hasOptions(item) ? options : undefined); onClose(); }}
            >
              {item.price <= 0
                ? t("catalog.soon")
                : !ready
                  ? t("opt.chooseFirst")
                  : options.sticker && item.stickerPrice
                    ? `Додати в кошик — ${item.price + item.stickerPrice} грн`
                    : t("cart.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
