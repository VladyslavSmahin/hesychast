"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ArrowBtn from "./ArrowBtn";
import MenuCard from "./MenuCard";
import { usePublicCatalog, usePublicNavSpecials, useGloss } from "@/features/publicData";
import { useIsMobile } from "@/features/useIsMobile";
import type { Product } from "@/lib/types";

const PER_PAGE = 4;
const AUTO_MS = 2000; // мобільний слайдер: крок кожні 2 с

export default function Hits({
  onAdd,
  onCardClick,
}: {
  onAdd: (item: Product) => void;
  onCardClick: (item: Product) => void;
}) {
  const isMobile = useIsMobile();
  const catalog = usePublicCatalog();

  // вкладки — ті самі спец-пункти, що й у навігації: вимкнув у адмінці → зник і тут
  const specials = usePublicNavSpecials();
  const labels = {
    hity: useGloss("nav_hity"),
    novynky: useGloss("nav_novynky"),
    aktsii: useGloss("nav_aktsii"),
  };

  const tabs = useMemo(() => {
    const byId: Record<string, Product[]> = {
      novynky: catalog.filter((m) => m.badge === "НОВЕ"),
      hity: catalog.filter((m) => m.badge === "ХІТ"),
      aktsii: catalog.filter((m) => m.oldPrice != null),
    };
    return specials
      .filter((sp) => byId[sp.id])
      .map((sp) => ({ key: sp.id, label: labels[sp.id as keyof typeof labels] ?? sp.label, items: byId[sp.id] }));
  }, [catalog, specials, labels.hity, labels.novynky, labels.aktsii]);

  const [tabIdx, setTabIdx] = useState(0);
  const [page, setPage] = useState(0);

  // стартова вкладка — перша непорожня (щоб не відкривалась порожня)
  useEffect(() => {
    if (tabs[tabIdx]?.items.length === 0) {
      const first = tabs.findIndex((t) => t.items.length > 0);
      if (first >= 0) setTabIdx(first);
    }
    // лише при зміні набору товарів; ручний вибір порожньої вкладки не чіпаємо
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  // немає активних вкладок або товарів — секцію не показуємо
  if (!tabs.length || tabs.every((t) => t.items.length === 0)) return null;

  const active = tabs[tabIdx];
  const items = active.items;
  const pages = Math.ceil(items.length / PER_PAGE);
  const safePage = Math.min(page, Math.max(0, pages - 1));
  const visible = items.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  const selectTab = (i: number) => { setTabIdx(i); setPage(0); };
  const prev = () => setPage((p) => (p - 1 + pages) % pages);
  const next = () => setPage((p) => (p + 1) % pages);

  return (
    <section id="hits" style={{ padding: "var(--py) var(--page-pad)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "var(--head-mb)", gap: 16, flexWrap: "wrap" }}>
          {/* перемикач вкладок — кнопки в квадратній рамці (як «Фільтри/Сортування»), трохи більший шрифт */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {tabs.map((t, i) => {
              const on = i === tabIdx;
              return (
                <button
                  key={t.key}
                  onClick={() => selectTab(i)}
                  className={`chip square ${on ? "active" : ""}`}
                  style={{ fontSize: 14, padding: "11px 22px", letterSpacing: 1.4 }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {!isMobile && pages > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              <ArrowBtn dir="left" onClick={prev} />
              <ArrowBtn dir="right" onClick={next} />
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 15, opacity: 0.8, padding: "8px 0" }}>Поки немає товарів у цій категорії.</p>
        ) : isMobile ? (
          // key — щоб при зміні вкладки слайдер стартував з початку й знову гортав сам
          <MobileRow key={active.key} items={items} onAdd={onAdd} onCardClick={onCardClick} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "var(--menu-cols)", gap: 20 }}>
            {visible.map((item) => (
              <MenuCard key={item.id} item={item} onAdd={onAdd} onCardClick={onCardClick} />
            ))}
          </div>
        )}

        {!isMobile && pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`Сторінка ${i + 1}`}
                style={{
                  width: i === safePage ? 24 : 8, height: 8, borderRadius: 4,
                  background: i === safePage ? "var(--accent)" : "var(--border-light)",
                  border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const GAP = 12;

/**
 * Мобільний слайдер в один рядок: 2 картки на екрані, сам гортає по одній кожні 2 с
 * (з останньої — на початок). Перший дотик покупця зупиняє автогортання до зміни вкладки.
 */
function MobileRow({
  items,
  onAdd,
  onCardClick,
}: {
  items: Product[];
  onAdd: (item: Product) => void;
  onCardClick: (item: Product) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || items.length <= 2) return;
    // хто просить менше анімацій — не гортаємо самі
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const el = track.current;
      const card = el?.firstElementChild as HTMLElement | null;
      if (!el || !card) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: card.offsetWidth + GAP, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [auto, items.length]);

  const stop = () => setAuto(false);

  return (
    <div
      ref={track}
      className="no-scrollbar"
      onTouchStart={stop}
      onPointerDown={stop}
      onWheel={stop}
      style={{
        display: "flex", gap: GAP, overflowX: "auto", scrollSnapType: "x mandatory",
        // картки «впритул» до краю екрана — видно, що рядок гортається
        margin: "0 calc(-1 * var(--page-pad))", padding: "0 var(--page-pad)", scrollPaddingLeft: "var(--page-pad)",
      }}
    >
      {items.map((item) => (
        <div key={item.id} style={{ flex: `0 0 calc(50% - ${GAP / 2}px)`, scrollSnapAlign: "start", display: "grid" }}>
          <MenuCard item={item} onAdd={onAdd} onCardClick={onCardClick} />
        </div>
      ))}
    </div>
  );
}
