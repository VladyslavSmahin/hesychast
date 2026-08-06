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

export const metadata: Metadata = {
  title: "ІСИХАСТ — православна крамниця",
  description:
    "Православний мерч та продукти з пасіки. Крамниця ІСИХАСТ.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${cormorant.variable} ${jost.variable} ${church.variable}`}>
      <body>
        <CartProvider>{children}</CartProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
