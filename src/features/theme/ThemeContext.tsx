"use client";

// Перемикач теми. Тримається на атрибуті data-theme у <html>: усі кольори
// в CSS — змінні, тому зміна атрибута миттєво перефарбовує весь сайт.
// Джерело правди — cookie (як і для мови), щоб SSR віддавав правильну тему.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_COOKIE, normalizeTheme, type Theme } from "@/lib/theme";

interface Value {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const Ctx = createContext<Value>({ theme: DEFAULT_THEME, setTheme: () => {}, toggleTheme: () => {} });

function readCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(dark|light)`));
  return (m?.[1] as Theme) ?? null;
}

export function ThemeProvider({ initial, children }: { initial?: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial ?? DEFAULT_THEME);
  // поки не звірились із DOM, не чіпаємо data-theme: там уже стоїть значення,
  // яке до першого малювання виставив THEME_INIT_SCRIPT (тема за часом доби)
  const [synced, setSynced] = useState(Boolean(initial));

  useEffect(() => {
    // cookie — якщо відвідувач обирав тему сам; інакше беремо те,
    // що вирахував інлайн-скрипт у <head>
    const saved = readCookie() ?? normalizeTheme(document.documentElement.dataset.theme);
    setThemeState(saved);
    setSynced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (synced) document.documentElement.dataset.theme = theme;
  }, [theme, synced]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(normalizeTheme(t));
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ theme, setTheme, toggleTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): Value {
  return useContext(Ctx);
}
