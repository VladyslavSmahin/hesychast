// Глосарій — редаговані назви/підписи сутностей, які інакше захардкоджені в коді.
// Зберігається в settings (key='glossary'). Додавати нові ключі — лише сюди.

export interface GlossaryEntry {
  key: string;
  label: string;       // підпис у адмінці
  default: string;     // значення за замовчуванням
  group: string;       // секція в адмінці
  hint?: string;
  multiline?: boolean; // textarea замість input (для довгих текстів)
}

const ABOUT_DEFAULT = `ІСИХАСТ — православна крамниця, де кожен виріб зроблено з молитвою та любов'ю. Ми пропонуємо мед із власної пасіки, церковне начиння та православний мерч.

Наша філософія проста: натуральність, чесність і турбота. Мед збираємо на власній пасіці, свічки — з натурального воску, а кожне замовлення відправляємо з благословенням.

Замовляйте доставку Новою Поштою або самовивіз — і відчуйте тепло нашої справи.`;

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  { key: "badge_hit", label: "Бейдж «хіт»", default: "ХІТ", group: "Бейджі", hint: "Текст плашки на товарах-хітах" },
  { key: "badge_new", label: "Бейдж «новинка»", default: "НОВЕ", group: "Бейджі", hint: "Текст плашки на новинках" },
  { key: "title_hits", label: "Заголовок блоку хітів", default: "Популярне", group: "Блоки головної" },
  { key: "title_full_menu", label: "Заголовок каталогу", default: "Каталог", group: "Блоки головної" },
  { key: "nav_novynky", label: "Навігація: «новинки»", default: "Новинки", group: "Навігація", hint: "Кнопка в шапці + заголовок розділу новинок" },
  { key: "nav_aktsii", label: "Навігація: «акції»", default: "Акції", group: "Навігація" },
  { key: "cart_extras", label: "Кошик: блок «додатково»", default: "Додатково", group: "Кошик" },
  { key: "about_title", label: "Про нас: заголовок", default: "Про нас", group: "Про нас" },
  { key: "about_text", label: "Про нас: текст", default: ABOUT_DEFAULT, group: "Про нас", multiline: true, hint: "Абзаци розділяються порожнім рядком" },
];

export type Glossary = Record<string, string>;

export const GLOSSARY_DEFAULTS: Glossary = Object.fromEntries(
  GLOSSARY_ENTRIES.map((e) => [e.key, e.default])
);

/** Безпечний парс jsonb-налаштувань: дефолти + перекриття непорожніми рядками. */
export function parseGlossary(v: unknown): Glossary {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const out: Glossary = { ...GLOSSARY_DEFAULTS };
  for (const e of GLOSSARY_ENTRIES) {
    const val = o[e.key];
    if (typeof val === "string" && val.trim()) out[e.key] = val;
  }
  return out;
}
