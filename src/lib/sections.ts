// Блоки головної сторінки, які можна вимкнути в адмінці.
// Самі блоки фіксовані; у БД (settings, key='sections') зберігається лише видимість.

export interface SectionEntry {
  id: string;
  label: string;
  hint?: string;
}

export const SECTIONS: SectionEntry[] = [
  { id: "hits",     label: "Популярне (хіти)", hint: "Блок товарів із бейджем «ХІТ»" },
  { id: "catalog",  label: "Каталог",          hint: "Основна сітка товарів" },
  { id: "clients",  label: "Наші клієнти",     hint: "Фотогалерея клієнтів + кнопка відгуку" },
  { id: "videos",   label: "Відеогалерея",     hint: "Відео клієнтів у героєві" },
  { id: "reviews",  label: "Відгуки",          hint: "Стрічка текстових відгуків" },
  { id: "news",     label: "Новини (Telegram)", hint: "Дописи з відстежуваних каналів" },
  { id: "map",      label: "Контакти й карта", hint: "Блок із картою та контактами" },
  { id: "banners",  label: "Банери в героєві", hint: "Промо-слайдер акційних банерів" },
];

export type SectionVisibility = Record<string, boolean>;

/** Парс jsonb-видимості; за замовчуванням блок увімкнений. */
export function parseSections(v: unknown): SectionVisibility {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const out: SectionVisibility = {};
  for (const s of SECTIONS) out[s.id] = o[s.id] !== false;
  return out;
}

export const SECTIONS_DEFAULT: SectionVisibility = parseSections(null);
