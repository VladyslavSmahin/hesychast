import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Old_Standard_TT } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cookies } from "next/headers";
import { CartProvider } from "@/features/cart/CartContext";
import { LocaleProvider } from "@/features/locale/LocaleContext";
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
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
  // мову памʼятаємо в cookie — сервер віддає сторінку одразу потрібною
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "ru" ? "ru" : DEFAULT_LOCALE;

  return (
    <html lang={locale} className={`${cormorant.variable} ${jost.variable} ${church.variable}`}>
      <body>
        <LocaleProvider initial={locale}>
          <CartProvider>{children}</CartProvider>
        </LocaleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
