import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Old_Standard_TT } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cookies } from "next/headers";
import { CartProvider } from "@/features/cart/CartContext";
import { AccountProvider } from "@/features/account/AccountContext";
import { LocaleProvider } from "@/features/locale/LocaleContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { THEME_COOKIE, THEME_INIT_SCRIPT, normalizeTheme, type Theme } from "@/lib/theme";
import { SITE_URL, IS_PUBLIC_DOMAIN } from "@/lib/siteUrl";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

// Церковний/класичний шрифт для заголовків (H1, назва бренду).
// TODO: за бажанням замінити на справжній церковнослов'янський статут/в'язь
// (Fedorovsk / Ponomar Unicode) — self-host через next/font/local у public/fonts.
const church = Old_Standard_TT({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-church-src",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ІСІХАСТ — православна крамниця: мед з пасіки, церковне начиння, мерч",
    template: "%s | ІСІХАСТ",
  },
  description:
    "Мед із власної пасіки, церковне начиння та православний мерч. Крамниця ІСІХАСТ — кожен виріб з молитвою та любов'ю. Доставка Новою Поштою.",
  alternates: { canonical: "/" },
  // На тимчасовому домені додатково закриваємо сторінки мета-тегом:
  // robots.txt не гарантує, що сторінка не потрапить у видачу за посиланням.
  ...(IS_PUBLIC_DOMAIN ? {} : { robots: { index: false, follow: false } }),
  openGraph: {
    type: "website",
    siteName: "ІСІХАСТ",
    locale: "uk_UA",
    url: "/",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // мову й тему памʼятаємо в cookie — сервер віддає сторінку одразу потрібною
  const jar = await cookies();
  const cookieLocale = jar.get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "ru" ? "ru" : DEFAULT_LOCALE;
  // Тему проставляємо ще на сервері, якщо відвідувач її вже обирав.
  // Якщо ні — data-theme лишаємо порожнім: його до першого малювання
  // виставить THEME_INIT_SCRIPT за часом доби (сервер локального часу не знає).
  const savedTheme = jar.get(THEME_COOKIE)?.value;
  const theme: Theme | undefined = savedTheme ? normalizeTheme(savedTheme) : undefined;

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning className={`${cormorant.variable} ${jost.variable} ${church.variable}`}>
      <body>
        {/* виконується синхронно до відмальовки контенту — інакше блимне
            тема за замовчуванням (власний <head> тут ставити не можна:
            Next сам збирає його з metadata і підключає стилі) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider initial={theme}>
          <LocaleProvider initial={locale}>
            <AccountProvider>
              <CartProvider>{children}</CartProvider>
            </AccountProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
