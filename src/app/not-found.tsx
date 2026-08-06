import type { Metadata } from "next";
import Link from "next/link";
import CatalogShell from "@/components/catalog/CatalogShell";
import { fetchPublicData } from "@/features/publicData.server";

export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  description: "Такої сторінки немає. Поверніться на головну або оберіть категорію крамниці ІСИХАСТ.",
  robots: { index: false, follow: true },
};

// Сторінка 404. Замість глухого кута — веде далі: на головну та в категорії,
// які беремо з БД (той самий кеш, що й на вітрині).
export default async function NotFound() {
  const { categories } = await fetchPublicData();
  const visible = categories.filter((c) => c.isActive);

  return (
    <CatalogShell>
      <div style={{ padding: "48px 0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-church)", fontSize: 72, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, marginTop: 18, marginBottom: 14 }}>
          Сторінку не знайдено
        </h1>
        <p style={{ fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 32px" }}>
          Можливо, товар прибрали з продажу або в адресі є помилка.
          Загляньте до каталогу — там мед із власної пасіки, церковне начиння та мерч.
        </p>

        <Link href="/" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          На головну
        </Link>

        {visible.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <div className="eyebrow" style={{ marginBottom: 14, fontSize: 11 }}>Категорії</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {visible.map((c) => (
                <Link
                  key={c.id}
                  href={`/katalog/${c.slug}`}
                  className="chip"
                  style={{ textDecoration: "none", color: "var(--text-primary)" }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </CatalogShell>
  );
}
