import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "@/components/catalog/CatalogShell";
import ProductGridCard from "@/components/catalog/ProductGridCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { fetchCategoryBySlug } from "@/features/catalog.server";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await fetchCategoryBySlug(slug);
  if (!found) return { title: "Категорію не знайдено" };

  const { category, products } = found;
  const description = `${category.name} — ${products.length} ${plural(products.length)} у православній крамниці ІСИХАСТ. Мед із власної пасіки, церковне начиння та православний мерч.`;

  return {
    // бренд додає template з layout
    title: `${category.name} — купити`,
    description,
    alternates: { canonical: `/katalog/${category.slug}` },
    openGraph: {
      type: "website",
      title: `${category.name} — ІСИХАСТ`,
      description,
      url: `/katalog/${category.slug}`,
      images: products.find((p) => p.photo)?.photo
        ? [{ url: products.find((p) => p.photo)!.photo!, alt: category.name }]
        : undefined,
    },
  };
}

/** «товар / товари / товарів» за українськими правилами. */
function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "товари";
  return "товарів";
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const found = await fetchCategoryBySlug(slug);
  if (!found) notFound();

  const { category, products } = found;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          { name: category.name, path: `/katalog/${category.slug}` },
        ])}
      />
      {products.length > 0 && <JsonLd data={itemListSchema(products)} />}
      <CatalogShell
      breadcrumbs={
        <nav aria-label="Хлібні крихти" style={{ fontSize: 12, letterSpacing: 0.5, color: "var(--text-secondary)", marginBottom: 22 }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Головна</Link>
          {" · "}
          <span style={{ color: "var(--text-primary)" }}>{category.name}</span>
        </nav>
      }
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h1-size, 40px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 10 }}>
        {category.name}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 32 }}>
        {products.length} {plural(products.length)}
      </p>

      {products.length === 0 ? (
        <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
          У цій категорії поки немає товарів. Загляньте до{" "}
          <Link href="/" style={{ color: "var(--accent)" }}>каталогу</Link>.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(var(--menu-cols, 4), minmax(0, 1fr))", gap: 18 }}>
          {products.map((p) => (
            <ProductGridCard key={p.id} item={p} />
          ))}
        </div>
      )}
      </CatalogShell>
    </>
  );
}
