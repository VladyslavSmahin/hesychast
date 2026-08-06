import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "@/components/catalog/CatalogShell";
import ProductGridCard from "@/components/catalog/ProductGridCard";
import AddToCartButton from "@/components/catalog/AddToCartButton";
import { PhotoSlot } from "@/components/icons";
import JsonLd from "@/components/JsonLd";
import { productSchema, breadcrumbSchema } from "@/lib/schema";
import { fetchProductBySlug, fetchRelatedProducts } from "@/features/catalog.server";

type Params = { params: Promise<{ slug: string }> };

// Заголовок і опис беруться з БД для КОЖНОГО товару — окрема сторінка
// в пошуковій видачі під свій запит (замість спільного title головної).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await fetchProductBySlug(slug);
  if (!found) return { title: "Товар не знайдено" };

  const { product, category } = found;
  const description =
    product.desc?.trim() ||
    `${product.name}${category ? ` — ${category.name.toLowerCase()}` : ""} у православній крамниці ІСИХАСТ. Ціна ${product.price} грн.`;

  return {
    // бренд додає template з layout — тут лише назва товару
    title: `${product.name} — купити`,
    description,
    alternates: { canonical: `/tovar/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ІСИХАСТ`,
      description,
      url: `/tovar/${product.slug}`,
      images: product.photo ? [{ url: product.photo, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const found = await fetchProductBySlug(slug);
  if (!found) notFound();

  const { product, category } = found;
  const related = await fetchRelatedProducts(product.category, product.id);

  const crumbLink: React.CSSProperties = { color: "var(--text-secondary)", textDecoration: "none" };

  return (
    <>
      <JsonLd data={productSchema(product, category?.name)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          ...(category ? [{ name: category.name, path: `/katalog/${category.slug}` }] : []),
          { name: product.name, path: `/tovar/${product.slug}` },
        ])}
      />
      <CatalogShell
      breadcrumbs={
        <nav aria-label="Хлібні крихти" style={{ fontSize: 12, letterSpacing: 0.5, color: "var(--text-secondary)", marginBottom: 22 }}>
          <Link href="/" style={crumbLink}>Головна</Link>
          {category && (
            <>
              {" · "}
              <Link href={`/katalog/${category.slug}`} style={crumbLink}>{category.name}</Link>
            </>
          )}
          {" · "}
          <span style={{ color: "var(--text-primary)" }}>{product.name}</span>
        </nav>
      }
    >
      <article style={{ display: "grid", gridTemplateColumns: "var(--modal-cols)", gap: 32, alignItems: "start" }}>
        <div style={{ position: "relative", background: "var(--bg-dark)", border: "1px solid var(--border)", minHeight: "var(--modal-photo-h, 320px)" }}>
          <PhotoSlot h="100%" photo={product.photo} />
          {product.badge && (
            <div
              style={{
                position: "absolute", top: 16, left: 16, padding: "6px 12px",
                background: product.badge === "НОВЕ" ? "var(--badge-new)" : "var(--accent)",
                color: "#0A0908", fontSize: 11, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
              }}
            >
              {product.badge}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
            {product.name}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
            {product.weight && (
              <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                {product.weight}
              </span>
            )}
            <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: product.oldPrice ? "var(--accent)" : "var(--text-primary)", lineHeight: 1, whiteSpace: "nowrap" }}>
              {product.oldPrice && (
                <span style={{ fontSize: 17, fontWeight: 400, color: "var(--text-secondary)", textDecoration: "line-through", marginRight: 8 }}>
                  {product.oldPrice}
                </span>
              )}
              {product.price} <span style={{ fontSize: 15, fontWeight: 400 }}>грн</span>
            </span>
          </div>

          {product.desc && (
            <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.7, opacity: 0.92, marginBottom: 24 }}>
              {product.desc}
            </p>
          )}

          <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <AddToCartButton product={product} />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 12 }}>
              Оплата при отриманні. Доставка Новою Поштою або самовивіз.
            </p>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, marginBottom: 22 }}>
            Схожі товари
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(var(--menu-cols, 4), minmax(0, 1fr))", gap: 18 }}>
            {related.map((p) => (
              <ProductGridCard key={p.id} item={p} />
            ))}
          </div>
        </section>
      )}
      </CatalogShell>
    </>
  );
}
