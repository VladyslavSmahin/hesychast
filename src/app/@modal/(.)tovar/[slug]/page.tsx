import { notFound } from "next/navigation";
import ProductModalRoute from "@/components/catalog/ProductModalRoute";
import { fetchProductBySlug } from "@/features/catalog.server";

// Перехоплений маршрут: клік по картці всередині сайту відкриває товар модалкою,
// але адреса стає /tovar/<slug>. Прямий захід чи F5 віддає повну сторінку
// (src/app/tovar/[slug]/page.tsx) — саме її бачить пошуковик.
export default async function ProductModalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await fetchProductBySlug(slug);
  if (!found) notFound();

  return <ProductModalRoute product={found.product} />;
}
