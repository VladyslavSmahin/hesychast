// Базова адреса сайту — один источник для canonical, og:url, robots і sitemap.
// Домену ще немає: беремо NEXT_PUBLIC_SITE_URL, інакше адресу від Vercel,
// інакше localhost. Після покупки домену — прописати NEXT_PUBLIC_SITE_URL у Vercel.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

/** Абсолютна адреса для шляху виду "/tovar/med". */
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
