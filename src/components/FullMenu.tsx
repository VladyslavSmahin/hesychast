"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MenuCard from "./MenuCard";
import { usePublicCatalog, usePublicCategories, useGloss, useLocalized } from "@/features/publicData";
import { useIsMobile } from "@/features/useIsMobile";
import { useT } from "@/features/locale/LocaleContext";
import type { Product, NavCategory } from "@/lib/types";

type NavFilter = NonNullable<NavCategory["filter"]>;

// скільки товарів вантажимо за раз: мобілка (2 кол.) — 10, десктоп (4/3 кол.) — 12 (повні ряди)
const PAGE_MOBILE = 10;
const PAGE_DESKTOP = 12;


export default function FullMenu({
  onAdd,
  onCardClick,
  navFilter,
  setNavFilter,
}: {
  onAdd: (item: Product) => void;
  onCardClick: (item: Product) => void;
  navFilter: NavFilter | null;
  setNavFilter: (f: NavFilter | null) => void;
}) {
  const isMobile = useIsMobile();
  const catalog = usePublicCatalog();
  const cats = usePublicCategories();
  const { categoryName } = useLocalized();
  const t = useT();
  const glossNovynky = useGloss("nav_novynky");
  const glossFullMenu = useGloss("title_full_menu");
  const pageSize = isMobile ? PAGE_MOBILE : PAGE_DESKTOP;
  const [visibleCount, setVisibleCount] = useState(PAGE_DESKTOP);

  const items = useMemo(() => {
    let list = catalog;
    if (navFilter) {
      if (navFilter.category) list = list.filter((m) => m.category === navFilter.category);
      else if (navFilter.badge) list = list.filter((m) => m.badge === navFilter.badge);
    }
    return list;
  }, [catalog, navFilter]);

  useEffect(() => { setVisibleCount(pageSize); }, [navFilter, pageSize]);

  const shown = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const title = navFilter?.category
    ? (() => { const c = cats.find((x) => x.slug === navFilter.category); return c ? categoryName(c) : "Меню"; })()
    : navFilter?.badge === "НОВЕ"
      ? glossNovynky
      : glossFullMenu;

  return (
    <section id="menu" style={{ padding: "32px var(--page-pad) var(--py)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <h2 className="section-title" style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1, color: "var(--text-primary)" }}>
              {title}
            </h2>
            {navFilter && (
              <button
                onClick={() => setNavFilter(null)}
                style={{
                  background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)",
                  padding: "8px 16px", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                {t("catalog.allMenu")} ×
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-secondary)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22 }}>{t("catalog.nothing")}</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "var(--menu-cols)", gap: 20 }}>
              {shown.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={onAdd} onCardClick={onCardClick} />
              ))}
            </div>

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
                <button className="btn-secondary" onClick={() => setVisibleCount((c) => c + pageSize)}>
                  {t("catalog.more")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </section>
  );
}
