import type { SVGProps } from "react";
import Image from "next/image";

type P = SVGProps<SVGSVGElement>;

export const Icon = {
  /**
   * Восьмиконечний православний хрест: верхня коротка перекладина (титло),
   * середня основна та нижня коса (підніжжя, підняте праворуч від глядача).
   */
  Cross: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <path d="M12 2v20" />
      <path d="M8.5 6h7" />
      <path d="M5 10.5h14" />
      <path d="M7.5 17.5l9-3" />
    </svg>
  ),
  Cart: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 4h2.5l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6.5" />
      <circle cx="10" cy="20.5" r="1.1" />
      <circle cx="18" cy="20.5" r="1.1" />
    </svg>
  ),
  User: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
    </svg>
  ),
  Close: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" {...p}>
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  ),
  Arrow: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Trash: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 7h16M9 7V4h6v3M10 11v7M14 11v7M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </svg>
  ),
  Plus: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <path d="M5 12h14" />
    </svg>
  ),
  Phone: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  Star: ({ filled, ...p }: P & { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...p}>
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
    </svg>
  ),
  Pin: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  Clock: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  Instagram: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  Telegram: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" {...p}>
      <path d="M21.5 4.5L2.5 12.2l5.5 1.7 2.3 5.6 3-3.4 5.4 4 2.8-15.6z" />
      <path d="M8 13.9l8.5-6.8-6.5 8" />
    </svg>
  ),
  // фірмові (залиті) логотипи — для кнопок соцмереж у брендових кольорах
  TelegramBrand: (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  ),
  FacebookBrand: (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2C11.54 2 9.68 3.66 9.68 6.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.28-1.73 1.76-1.73z" />
    </svg>
  ),
  TikTokBrand: (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .76-5.06V9.7a5.65 5.65 0 0 0-.76-.05 5.7 5.7 0 1 0 5.7 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.26-1.48z" />
    </svg>
  ),
  InstagramBrand: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Facebook: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M15.5 8h-1.6c-1 0-1.6.6-1.6 1.6V11H15l-.4 2.6h-2.3V21" />
      <path d="M10 11h2.3" />
    </svg>
  ),
  TikTok: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 3v11.2a3.6 3.6 0 1 1-3-3.55" />
      <path d="M14 6.2c.7 1.6 2.2 2.7 4.2 2.8" />
    </svg>
  ),
};

/**
 * Слот під фото товару. Всередині — next/image: ліниве завантаження, потрібний
 * розмір під екран і сучасні формати. Раніше фото ставилось як CSS background —
 * браузер вантажив повну картинку одразу, а пошуковик такі зображення не бачить
 * (немає ні <img>, ні alt).
 *
 * alt — назва товару: це і доступність, і трафік з пошуку по зображеннях.
 * priority ставимо лише головному фото сторінки товару (LCP-елемент).
 */
export function PhotoSlot({
  h = 280,
  photo,
  alt = "",
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1180px) 33vw, 300px",
  soon = false,
  soonLabel = "Скоро в продажу",
}: {
  h?: number | string;
  photo?: string | null;
  alt?: string;
  priority?: boolean;
  sizes?: string;
  /** товар ще без ціни — замість фото показуємо «Скоро в продажу» */
  soon?: boolean;
  /** підпис заглушки (мовою інтерфейсу) */
  soonLabel?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: h,
        background: photo ? "var(--img-bg)" : "var(--img-placeholder)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {photo ? (
        <Image
          src={photo}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 30%, rgba(192,190,200,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
      )}

      {soon && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 16,
            background: photo ? "var(--scrim)" : "transparent", backdropFilter: photo ? "blur(2px)" : undefined,
          }}
        >
          <Icon.Cross width="26" height="26" style={{ color: "var(--accent)", opacity: 0.9 }} />
          <span
            style={{
              fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, letterSpacing: 3,
              textTransform: "uppercase", color: "var(--text-primary)",
            }}
          >
            {soonLabel}
          </span>
        </div>
      )}
    </div>
  );
}
