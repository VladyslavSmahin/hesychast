// Базова адреса сайту — один источник для canonical, og:url, robots і sitemap.
// Домену ще немає: беремо NEXT_PUBLIC_SITE_URL, інакше адресу від Vercel,
// інакше localhost. Після покупки домену — прописати NEXT_PUBLIC_SITE_URL у Vercel.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

/** Абсолютна адреса для шляху виду "/tovar/med". */
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Чи це справжній домен магазину — від цього залежить, чи пускати пошуковик.
 *
 * Поки домен тимчасовий (*.vercel.app, прев'ю-деплої, localhost), індексувати
 * НЕ можна: адреси потраплять у видачу, а після переїзду на власний домен
 * доведеться робити 301-редіректи й частина сигналів усе одно втратиться.
 * Щойно в NEXT_PUBLIC_SITE_URL з'явиться власний домен — індексація вмикається
 * сама, без правок коду.
 */
export const IS_PUBLIC_DOMAIN =
  Boolean(process.env.NEXT_PUBLIC_SITE_URL) &&
  !/localhost|127\.0\.0\.1|\.vercel\.app/i.test(SITE_URL);
