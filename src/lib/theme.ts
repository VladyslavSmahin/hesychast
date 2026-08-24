// Тема оформлення сайту: темна (за замовчуванням) або світла.
// Вибір зберігаємо в cookie — сервер підставляє data-theme одразу в HTML,
// тому при завантаженні немає спалаху «чужої» теми.

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "theme";

export function normalizeTheme(value: string | undefined | null): Theme {
  return value === "light" ? "light" : DEFAULT_THEME;
}

/** Межі «світлого часу доби» — з 7:00 до 19:00 показуємо світлу тему. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 19;

/** Тема за годиною доби (година — локальна, з браузера відвідувача). */
export function themeByHour(hour: number): Theme {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? "light" : "dark";
}

/**
 * Скрипт, який виконується до першого малювання сторінки: якщо відвідувач ще
 * не обирав тему сам, ставимо її за часом доби. Робити це в React пізно —
 * встигне блимнути тема за замовчуванням.
 */
export const THEME_INIT_SCRIPT = `try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);
var t=m?m[1]:(function(){var h=new Date().getHours();return h>=${DAY_START_HOUR}&&h<${DAY_END_HOUR}?"light":"dark"})();
document.documentElement.dataset.theme=t;
}catch(e){}`;
