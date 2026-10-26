"use client";

import Link from "next/link";
import { Icon } from "./icons";
import PhotoGallery from "./PhotoGallery";
import { PreorderTag } from "./PreorderTag";
import { hasOptions } from "./ProductOptions";
import { useT } from "@/features/locale/LocaleContext";
import { useGloss, useLocalized } from "@/features/publicData";
import { isSoon, type Product } from "@/lib/types";

// Картка — це посилання на /tovar/<slug>: пошуковик бачить звичайне <a href>
// і доходить до сторінки товару. Клік користувача перехоплюємо самі — відкриваємо
// модалку й лише міняємо адресу в рядку браузера (див. HomeClient).
export default function MenuCard({
  item,
  onAdd,
  onCardClick,
  compact = false,
}: {
  item: Product;
  onAdd: (item: Product) => void;
  onCardClick: (item: Product) => void;
  /** компактний варіант (для блоку «Хіти меню») */
  compact?: boolean;
}) {
  const t = useT();
  const { productName, productWeight } = useLocalized();
  const badgeHit = useGloss("badge_hit");
  const badgeNew = useGloss("badge_new");
  const badgeLabel = item.badge === "ХІТ" ? badgeHit : item.badge === "НОВЕ" ? badgeNew : item.badge;
  const photoH = compact ? 124 : 160;
  const pad = compact ? 10 : 14;
  const titleSize = compact ? 15 : 18;
  const priceSize = compact ? 16 : 18;
  const addSize = compact ? 30 : 34;
  // ціна 0 — товар ще не в продажу: замість фото заглушка, кнопки «+» немає
  const soon = isSoon(item);

  return (
    <Link
      href={`/tovar/${item.slug}`}
      onClick={(e) => {
        // звичайний клік лишається в каталозі — відкриваємо модалку;
        // Ctrl/Cmd/середня кнопка працюють як завжди (нова вкладка)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onCardClick(item);
      }}
      className="menu-card fade-up"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        cursor: "pointer", display: "flex", flexDirection: "column", padding: pad,
        textDecoration: "none", color: "inherit",
      }}
    >
      <div style={{ position: "relative", background: "var(--bg-dark)", aspectRatio: compact ? undefined : "var(--card-ar, 1 / 1)" }}>
        <PhotoGallery h={compact ? photoH : "100%"} photos={item.photos} alt={productName(item)} soon={soon} soonLabel={t("catalog.soon")} />
        {item.badge && (
          <div
            style={{
              position: "absolute", top: 8, left: 8, padding: "3px 8px",
              background: item.badge === "НОВЕ" ? "var(--badge-new)" : "var(--scrim)",
              border: item.badge === "НОВЕ" ? "none" : "1px solid var(--border-light)",
              color: item.badge === "НОВЕ" ? "#1A1208" : "var(--text-primary)",
              fontSize: 9, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
              backdropFilter: "blur(6px)",
            }}
          >
            {badgeLabel}
          </div>
        )}
        {item.availability === "preorder" && (
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <PreorderTag />
          </div>
        )}
      </div>

      <div style={{ paddingTop: 0, paddingBottom: 4, flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: titleSize, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.15, marginTop: "var(--card-title-mt, 10px)", marginBottom: compact ? 4 : 6 }}>
          {productName(item)}
        </h3>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: priceSize, fontWeight: 500, color: item.oldPrice ? "var(--accent)" : "var(--text-primary)", lineHeight: 1, whiteSpace: "nowrap" }}>
            {item.oldPrice && <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)", textDecoration: "line-through", marginRight: 5 }}>{item.oldPrice}</span>}
            {soon
              ? <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)", letterSpacing: 1 }}>{t("catalog.soonShort")}</span>
              : <>{item.price} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>грн</span></>}
          </div>
          <div style={{ fontSize: compact ? 10 : 11, fontWeight: 400, color: "var(--text-secondary)", letterSpacing: 0.8, marginTop: 4, whiteSpace: "nowrap" }}>
            {productWeight(item)}
          </div>
        </div>
        {!soon && (
        <button
          // всередині посилання: гасимо перехід, щоб «+» лише клав товар у кошик
          // товар з опціями (розмір/колір/наклейка) не можна докинути одним кліком —
          // відкриваємо картку, щоб покупець обрав
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (hasOptions(item)) onCardClick(item); else onAdd(item);
          }}
          aria-label={hasOptions(item) ? "Обрати опції" : "Додати"}
          style={{
            width: addSize, height: addSize, flexShrink: 0, background: "transparent",
            border: "1px solid color-mix(in srgb, var(--accent) 55%, transparent)",
            color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--on-accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 55%, transparent)"; }}
        >
          <Icon.Plus width="13" height="13" />
        </button>
        )}
      </div>
    </Link>
  );
}
