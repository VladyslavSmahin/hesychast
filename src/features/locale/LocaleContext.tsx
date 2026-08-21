"use client";

// Мова інтерфейсу. Зберігається в cookie (щоб сервер теж бачив вибір)
// і застосовується миттєво без перезавантаження.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, translate, type Locale } from "@/lib/i18n";

interface Value {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<Value>({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k) => translate(k, DEFAULT_LOCALE) });

function readCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=(uk|ru)`));
  return (m?.[1] as Locale) ?? null;
}

export function LocaleProvider({ initial, children }: { initial?: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial ?? DEFAULT_LOCALE);

  // клієнтський вибір міг зʼявитись після рендера (SSR не бачив cookie)
  useEffect(() => {
    const saved = readCookie();
    if (saved && saved !== locale) setLocaleState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useLocale(): Value {
  return useContext(Ctx);
}

/** Коротко: лише функція перекладу. */
export function useT(): (key: string) => string {
  return useContext(Ctx).t;
}
