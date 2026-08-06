import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";
import { CONTACTS, TEXTS } from "@/data/site";
import type { Product } from "@/lib/types";

// Конструктори schema.org-розмітки. Тримаємо в одному місці, щоб сторінки
// лишались верткою, а правки в описі магазину робились тут.

const STORE_ID = `${SITE_URL}/#store`;

/** Телефон-заглушку (000-00-00) у розмітку не віддаємо — краще без поля, ніж хибне. */
const realPhone = () => (/0{3}-?0{2}-?0{2}/.test(CONTACTS.phone) ? null : CONTACTS.phone);

/** Магазин: показується в Google як картка організації. */
export function storeSchema() {
  const phone = realPhone();
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": STORE_ID,
    name: "ІСИХАСТ",
    description: TEXTS.footerTagline,
    url: SITE_URL,
    ...(phone ? { telephone: phone } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: CONTACTS.address,
      addressCountry: "UA",
    },
    openingHours: CONTACTS.hours,
    currenciesAccepted: "UAH",
    paymentAccepted: "Готівка, оплата при отриманні",
  };
}

/** Товар з ціною й наявністю — дає ціну прямо у видачі. */
export function productSchema(product: Product, categoryName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.desc ? { description: product.desc } : {}),
    ...(product.photo ? { image: product.photo } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    ...(product.weight ? { weight: product.weight } : {}),
    sku: product.slug,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/tovar/${product.slug}`),
      price: product.price,
      priceCurrency: "UAH",
      availability: "https://schema.org/InStock",
      seller: { "@id": STORE_ID },
    },
  };
}

/** Хлібні крихти — Google показує їх замість голого URL під заголовком. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Список товарів категорії. */
export function itemListSchema(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/tovar/${p.slug}`),
      name: p.name,
    })),
  };
}
