"use client";

// Селектори опцій одягу: розмір, колір і (необовʼязково) наклейка з бібліотеки.
// Для звичайних товарів (без розмірів/кольорів/наклейки) нічого не рендерить.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useProductOptions, useStickerLibrary } from "./ProductOptionsContext";
import { useT } from "@/features/locale/LocaleContext";
import type { CartOptions, Product } from "@/lib/types";

export function hasOptions(p: Product): boolean {
  return p.sizes.length > 0 || p.colors.length > 0 || p.stickerOption;
}

export default function ProductOptions() {
  const { product, options: value, setOptions: onChange } = useProductOptions();
  const stickers = useStickerLibrary();
  const t = useT();
  const [chartOpen, setChartOpen] = useState(false);
  const showStickers = product.stickerOption && stickers.length > 0;

  if (!hasOptions(product)) return null;

  const set = (patch: Partial<CartOptions>) => onChange({ ...value, ...patch });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 20, minWidth: 0 }}>
      {product.sizes.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <div className="eyebrow" style={{ fontSize: 11 }}>{t("opt.size")}</div>
            {product.sizeChart && (
              <button
                type="button"
                onClick={() => setChartOpen(true)}
                style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
              >
                {t("opt.sizeChart")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ size: s })}
                style={{
                  minWidth: 46, padding: "9px 12px", cursor: "pointer",
                  background: value.size === s ? "var(--accent)" : "transparent",
                  color: value.size === s ? "var(--on-accent)" : "var(--text-primary)",
                  border: `1px solid ${value.size === s ? "var(--accent)" : "var(--border-light)"}`,
                  fontSize: 13, letterSpacing: 1, transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.colors.length > 0 && (
        <div>
          <div className="eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>
            {t("opt.color")}{value.color ? <span style={{ color: "var(--text-secondary)", letterSpacing: 0 }}> — {value.color}</span> : null}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {product.colors.map((c) => {
              const active = value.color === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => set({ color: c.name })}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c.hex,
                    border: `2px solid ${active ? "var(--accent)" : "var(--border-light)"}`,
                    outline: active ? "2px solid var(--accent)" : "none", outlineOffset: 2,
                    transition: "all 0.15s",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {showStickers && (
        <div>
          <div className="eyebrow" style={{ fontSize: 11, marginBottom: 4 }}>
            {t("opt.sticker")}{product.stickerPrice > 0 ? ` (+${product.stickerPrice} ${t("catalog.uah")})` : ""}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
            {t("opt.stickerHint")}
          </p>
          <StickerSlider>
            <button
              type="button"
              onClick={() => set({ sticker: undefined, stickerPrice: undefined })}
              style={{
                flex: "0 0 auto", width: 76, height: 76, scrollSnapAlign: "start",
                cursor: "pointer", fontSize: 10, lineHeight: 1.25, padding: 4,
                background: "var(--bg-elevated)", color: !value.sticker ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${!value.sticker ? "var(--accent)" : "var(--border-light)"}`,
              }}
            >
              {t("opt.noSticker")}
            </button>
            {stickers.map((st) => {
              const active = value.sticker === st.name;
              return (
                <button
                  key={st.id}
                  type="button"
                  title={st.name}
                  onClick={() => set({ sticker: st.name, stickerPrice: product.stickerPrice || undefined })}
                  style={{
                    position: "relative", flex: "0 0 auto", width: 76, height: 76, scrollSnapAlign: "start",
                    cursor: "pointer", padding: 0, overflow: "hidden", background: "#fff",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border-light)"}`,
                    outline: active ? "1px solid var(--accent)" : "none",
                  }}
                >
                  <Image src={st.image} alt={st.name} fill sizes="90px" style={{ objectFit: "contain", padding: 5 }} />
                </button>
              );
            })}
          </StickerSlider>
        </div>
      )}

      {chartOpen && product.sizeChart && (
        <div
          onClick={() => setChartOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay-strong)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}
        >
          <div style={{ position: "relative", width: "min(560px, 100%)", height: "min(84vh, 900px)", background: "#fff" }}>
            <Image src={product.sizeChart} alt={t("opt.sizeChart")} fill sizes="560px" style={{ objectFit: "contain" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Чи вибрані всі обовʼязкові опції (розмір і колір, якщо вони налаштовані). */
export function optionsReady(p: Product, v: CartOptions): boolean {
  if (p.sizes.length && !v.size) return false;
  if (p.colors.length && !v.color) return false;
  return true;
}

/**
 * Слайдер наклейок: один ряд, гортається стрілками (і пальцем на тачскріні).
 * Стрілки зникають на краях, щоб не тицяти в нікуди.
 */
function StickerSlider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => { update(); }, [update, children]);

  const slide = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(168, Math.round(el.clientWidth * 0.8)), behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative", minWidth: 0, maxWidth: "100%" }}>
      <div
        ref={ref}
        onScroll={update}
        className="sticker-row"
        style={{ display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 6, scrollbarWidth: "none" }}
      >
        {children}
      </div>

      {!atStart && <SlideArrow dir="left" onClick={() => slide(-1)} />}
      {!atEnd && <SlideArrow dir="right" onClick={() => slide(1)} />}
    </div>
  );
}

function SlideArrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Попередні наклейки" : "Наступні наклейки"}
      style={{
        position: "absolute", top: 30, [dir]: -6, width: 30, height: 30, zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "50%", cursor: "pointer",
        background: "var(--scrim)", border: "1px solid var(--border-light)", color: "var(--text-primary)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }}>
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
