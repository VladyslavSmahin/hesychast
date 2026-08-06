import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Old_Standard_TT } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "@/features/cart/CartContext";
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

// Базова адреса для canonical і og:url на всіх сторінках. Домену ще немає —
// беремо з NEXT_PUBLIC_SITE_URL, інакше з адреси, яку дає Vercel.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ІСИХАСТ — православна крамниця: мед з пасіки, церковне начиння, мерч",
    template: "%s | ІСИХАСТ",
  },
  description:
    "Мед із власної пасіки, церковне начиння та православний мерч. Крамниця ІСИХАСТ — кожен виріб з молитвою та любов'ю. Доставка Новою Поштою.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ІСИХАСТ",
    locale: "uk_UA",
    url: "/",
  },
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** паралельний слот для модалки товару (перехоплений маршрут /tovar/<slug>) */
  modal: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${cormorant.variable} ${jost.variable} ${church.variable}`}>
      <body>
        <CartProvider>
          {children}
          {modal}
        </CartProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
