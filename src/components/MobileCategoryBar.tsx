"use client";

import { usePublicCategories, usePublicNavSpecials, useLocalized } from "@/features/publicData";
import { useIsMobile } from "@/features/useIsMobile";
import type { NavCategory } from "@/lib/types";

type NavFilter = NonNullable<NavCategory["filter"]>;

export default function MobileCategoryBar({
  active,
  onNavClick,
}: {
  active: NavFilter | null;
  onNavClick: (cat: NavCategory) => void;
}) {
  const isMobile = useIsMobile();
  const cats = usePublicCategories({ navOnly: true });
  const { categoryName } = useLocalized();
  const specials = usePublicNavSpecials();
  if (!isMobile) return null;

  const navItems: NavCategory[] = [
    ...specials,
    ...cats.map((c) => ({ id: c.id, label: categoryName(c), filter: { category: c.slug } })),
  ];

  const isActive = (c: NavCategory) => {
    if (!active || !c.filter) return false;
    if (c.filter.category) return active.category === c.filter.category;
    if (c.filter.badge) return active.badge === c.filter.badge;
    return false;
  };

  return (
    // закріплена смуга одразу під шапкою (висота — --catbar-h, під неї відступ у body)
    <div
      id="mobile-catbar"
      style={{
        position: "fixed", left: 0, right: 0, top: "var(--header-h)", zIndex: 99,
        height: "var(--catbar-h)", display: "flex", alignItems: "center",
        background: "var(--header-bg-scrolled)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 var(--page-pad)", width: "100%", scrollSnapType: "x proximity", scrollPaddingLeft: "var(--page-pad)" }}
      >
        {navItems.map((c) => {
          const act = isActive(c);
          return (
            <button
              key={c.id}
              onClick={() => onNavClick(c)}
              style={{
                flexShrink: 0, scrollSnapAlign: "start",
                padding: "9px 16px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap",
                background: "var(--bg-card)",
                border: `1px solid ${act ? "var(--accent)" : "var(--border-light)"}`,
                color: act ? "var(--accent)" : "var(--text-primary)", fontFamily: "var(--font-body)",
                fontSize: 13, fontWeight: act ? 600 : 500, letterSpacing: 0.5,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
