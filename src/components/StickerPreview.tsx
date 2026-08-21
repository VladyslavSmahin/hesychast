"use client";

// Прев'ю обраної наклейки — під головним фото товару, щоб було видно,
// що саме додається до футболки.

import Image from "next/image";
import { useProductOptions, useStickerLibrary } from "./ProductOptionsContext";
import { useT } from "@/features/locale/LocaleContext";

export default function StickerPreview() {
  const { product, options } = useProductOptions();
  const stickers = useStickerLibrary();
  const t = useT();

  if (!options.sticker) return null;
  const sticker = stickers.find((s) => s.name === options.sticker);
  if (!sticker) return null;

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", border: "1px solid var(--border)", background: "var(--bg-card)", padding: 12 }}>
      <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0, background: "#fff" }}>
        <Image src={sticker.image} alt={sticker.name} fill sizes="200px" style={{ objectFit: "contain", padding: 8 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>{t("opt.chosen")}</div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.35 }}>{sticker.name}</div>
        {product.stickerPrice > 0 && (
          <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>+{product.stickerPrice} {t("catalog.uah")}</div>
        )}
      </div>
    </div>
  );
}
