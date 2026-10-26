"use client";

// Стрічка «Скоро в продажу» під основним меню: товари з прапорцем coming_soon
// (адмінка → товар → «Скоро в продажу»). Гортається вбік; купити ще не можна —
// картки без кнопки «+», клік відкриває товар.

import { useRef } from "react";
import ArrowBtn from "./ArrowBtn";
import MenuCard from "./MenuCard";
import { usePublicComingSoon } from "@/features/publicData";
import { useT } from "@/features/locale/LocaleContext";
import type { Product } from "@/lib/types";

const GAP = 18;

export default function ComingSoonStrip({
  onAdd,
  onCardClick,
}: {
  onAdd: (item: Product) => void;
  onCardClick: (item: Product) => void;
}) {
  const t = useT();
  const items = usePublicComingSoon();
  const track = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const step = (dir: -1 | 1) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + GAP), behavior: "smooth" });
  };

  return (
    <section id="coming-soon" style={{ padding: "var(--py) var(--page-pad)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: "var(--head-mb)" }}>
          <h2 className="section-title" style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1, color: "var(--text-primary)" }}>
            {t("catalog.soon")}
          </h2>
          {items.length > 4 && (
            <div className="desktop-only" style={{ display: "flex", gap: 8 }}>
              <ArrowBtn dir="left" onClick={() => step(-1)} />
              <ArrowBtn dir="right" onClick={() => step(1)} />
            </div>
          )}
        </div>

        <div
          ref={track}
          className="no-scrollbar"
          style={{
            display: "flex", gap: GAP, overflowX: "auto", scrollSnapType: "x mandatory",
            // на телефоні картки доходять до краю екрана — видно, що стрічка гортається
            margin: "0 calc(-1 * var(--page-pad))", padding: "0 var(--page-pad)", scrollPaddingLeft: "var(--page-pad)",
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="soon-card" style={{ scrollSnapAlign: "start", display: "grid" }}>
              <MenuCard item={item} onAdd={onAdd} onCardClick={onCardClick} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
