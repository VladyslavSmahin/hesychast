import Link from "next/link";
import { PhotoSlot } from "@/components/icons";
import type { Product } from "@/lib/types";

// Серверна картка товару для сіток на сторінках категорії та «схожі товари».
// На відміну від MenuCard — це звичайне посилання без клієнтського стану,
// тож потрапляє у HTML і індексується пошуковиком.
export default function ProductGridCard({ item }: { item: Product }) {
  return (
    <Link
      href={`/tovar/${item.slug}`}
      className="menu-card"
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: 14, textDecoration: "none", color: "inherit",
      }}
    >
      <div style={{ position: "relative", background: "var(--bg-dark)", aspectRatio: "var(--card-ar, 1 / 1)" }}>
        <PhotoSlot h="100%" photo={item.photo} alt={item.name} />
      </div>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.15, marginTop: 10, marginBottom: 8 }}>
        {item.name}
      </h3>

      <div style={{ marginTop: "auto", fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 500, color: item.oldPrice ? "var(--accent)" : "var(--text-primary)", lineHeight: 1 }}>
        {item.oldPrice && (
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)", textDecoration: "line-through", marginRight: 5 }}>
            {item.oldPrice}
          </span>
        )}
        {item.price} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>грн</span>
        {item.weight && (
          <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-secondary)", letterSpacing: 0.8, marginTop: 4 }}>
            {item.weight}
          </div>
        )}
      </div>
    </Link>
  );
}
