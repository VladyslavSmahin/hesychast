import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { PreorderTag, PreorderNote } from "@/components/PreorderTag";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "@/components/catalog/CatalogShell";
import ProductGridCard from "@/components/catalog/ProductGridCard";
import AddToCartButton from "@/components/catalog/AddToCartButton";
import { ProductOptionsProvider } from "@/components/ProductOptionsContext";
import StickerPreview from "@/components/StickerPreview";
import PhotoGallery from "@/components/PhotoGallery";
import JsonLd from "@/components/JsonLd";
import { productSchema, breadcrumbSchema } from "@/lib/schema";
import { isSoon } from "@/lib/types";
import { fetchProductBySlug, fetchRelatedProducts, fetchAllSlugs, fetchStickers } from "@/features/catalog.server";

type Params = { params: Promise<{ slug: string }> };

// Пререндер сторінок наявних товарів на білді — швидша віддача.
// Товар, доданий пізніше, згенерується за першим запитом (dynamicParams за замовчуванням).
export async function generateStaticParams() {
  try {
    const { products } = await fetchAllSlugs();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return []; // БД недоступна на білді — не валимо збірку
  }
}

// Заголовок і опис беруться з БД для КОЖНОГО товару — окрема сторінка
// в пошуковій видачі під свій запит (замість спільного title головної).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await fetchProductBySlug(slug);
  if (!found) return { title: "Товар не знайдено" };

  const { product, category } = found;
  const description =
    product.desc?.trim() ||
    `${product.name}${category ? ` — ${category.name.toLowerCase()}` : ""} у православній крамниці ІСІХАСТ. Ціна ${product.price} грн.`;

  return {
    // бренд додає template з layout — тут лише назва товару
    title: `${product.name} — купити`,
    description,
    alternates: { canonical: `/tovar/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ІСІХАСТ`,
      description,
      url: `/tovar/${product.slug}`,
      images: product.photos.length ? product.photos.map((url) => ({ url, alt: product.name })) : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const found = await fetchProductBySlug(slug);
  if (!found) notFound();

  const { product, category } = found;
  const related = await fetchRelatedProducts(product.category, product.id);
  // мова сторінки — з cookie (перемикач у шапці)
  const isRu = (await cookies()).get(LOCALE_COOKIE)?.value === "ru";
  const name = (isRu && product.nameRu) || product.name;
  const desc = (isRu && product.descRu) || product.desc;
  const weight = (isRu && product.weightRu) || product.weight;
  const catName = category ? ((isRu && category.nameRu) || category.name) : "";
  // наклейки потрібні лише для одягу; сторінка товару рендериться без PublicDataProvider
  const stickers = product.stickerOption ? await fetchStickers() : [];

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
              <Link href={`/katalog/${category.slug}`} style={crumbLink}>{catName}</Link>
            </>
          )}
          {" · "}
          <span style={{ color: "var(--text-primary)" }}>{name}</span>
        </nav>
      }
    >
      <ProductOptionsProvider product={product} stickers={stickers}>
      <article style={{ display: "grid", gridTemplateColumns: "var(--modal-cols)", gap: 32, alignItems: "start" }}>
        {/* фото — квадрат, як у модалці */}
        <div style={{ position: "relative", background: "var(--bg-dark)", border: "1px solid var(--border)", aspectRatio: "1 / 1", minWidth: 0 }}>
          <PhotoGallery arrows h="100%" photos={product.photos} alt={name} priority sizes="(max-width: 900px) 100vw, 560px" soon={isSoon(product)} />
          {product.badge && (
            <div
              style={{
                position: "absolute", top: 16, left: 16, padding: "6px 12px",
                background: product.badge === "НОВЕ" ? "var(--badge-new)" : "var(--accent)",
                color: "var(--on-accent)", fontSize: 11, fontWeight: 500, letterSpacing: 2.5, textTransform: "uppercase",
              }}
            >
              {product.badge}
            </div>
          )}
          {product.availability === "preorder" && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <PreorderTag size="md" />
            </div>
          )}
        </div>
        <StickerPreview />

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
            {name}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
            {weight && (
              <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                {weight}
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

          {desc && (
            <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.7, opacity: 0.92, marginBottom: 24 }}>
              {desc}
            </p>
          )}

          <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            {product.availability === "preorder" && <PreorderNote />}
            <AddToCartButton />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 12 }}>
              {isRu ? "Оплата при получении. Доставка Новой Почтой." : "Оплата при отриманні. Доставка Новою Поштою."}
            </p>
          </div>
        </div>
      </article>
      </ProductOptionsProvider>

      {related.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, marginBottom: 22 }}>
            {isRu ? "Похожие товары" : "Схожі товари"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "var(--menu-cols)", gap: 18 }}>
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
