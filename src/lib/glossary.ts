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

const ABOUT_DEFAULT = `ІСІХАСТ — православна крамниця, де кожен виріб зроблено з молитвою та любов'ю. Ми пропонуємо мед із власної пасіки, церковне начиння та православний мерч.

Наша філософія проста: натуральність, чесність і турбота. Мед збираємо на власній пасіці, свічки — з натурального воску, а кожне замовлення відправляємо з благословенням.

Замовляйте доставку Новою Поштою або самовивіз — і відчуйте тепло нашої справи.`;

const ABOUT_DEFAULT_RU = `ІСІХАСТ — православная лавка, где каждое изделие сделано с молитвой и любовью. Мы предлагаем мёд с собственной пасеки, церковную утварь и православный мерч.

Наша философия проста: натуральность, честность и забота. Мёд собираем на своей пасеке, свечи — из натурального воска, а каждый заказ отправляем с благословением.

Заказывайте доставку Новой Почтой — и почувствуйте тепло нашего дела.`;

// Базові записи (українською). Російські версії кожного ключа додаються нижче
// автоматично — з суфіксом «_ru», щоб перекладом теж керували з адмінки.
const BASE_ENTRIES: GlossaryEntry[] = [
  { key: "badge_hit", label: "Бейдж «хіт»", default: "ХІТ", group: "Бейджі", hint: "Текст плашки на товарах-хітах" },
  { key: "badge_new", label: "Бейдж «новинка»", default: "НОВЕ", group: "Бейджі", hint: "Текст плашки на новинках" },
  { key: "title_hits", label: "Заголовок блоку хітів", default: "Популярне", group: "Блоки головної" },
  { key: "title_full_menu", label: "Заголовок каталогу", default: "Каталог", group: "Блоки головної" },
  { key: "nav_hity", label: "Навігація: «популярне»", default: "Популярне", group: "Навігація", hint: "Кнопка в шапці + заголовок розділу хітів" },
  { key: "nav_novynky", label: "Навігація: «новинки»", default: "Новинки", group: "Навігація", hint: "Кнопка в шапці + заголовок розділу новинок" },
  { key: "nav_aktsii", label: "Навігація: «акції»", default: "Акції", group: "Навігація" },
  { key: "cart_extras", label: "Кошик: блок «додатково»", default: "Додатково", group: "Кошик" },
  { key: "about_title", label: "Про нас: заголовок", default: "Про нас", group: "Про нас" },
  { key: "about_text", label: "Про нас: текст", default: ABOUT_DEFAULT, group: "Про нас", multiline: true, hint: "Абзаци розділяються порожнім рядком" },

  // заголовки блоків головної — щоб їх можна було перейменувати без коду
  { key: "title_hero_social", label: "Герой: підпис соцмереж", default: "Ми в соцмережах", group: "Блоки головної" },
  { key: "title_hero_videos", label: "Герой: заголовок відеогалереї", default: "Відеогалерея", group: "Блоки головної" },
  { key: "title_clients", label: "Клієнти: заголовок", default: "Наші клієнти", group: "Блоки головної" },
  { key: "subtitle_clients", label: "Клієнти: підзаголовок", default: "Фото та відгуки тих, хто вже носить наш мерч", group: "Блоки головної" },
  { key: "title_news", label: "Новини: заголовок", default: "Новини", group: "Блоки головної" },
  { key: "subtitle_news", label: "Новини: підзаголовок", default: "Останні дописи з наших Telegram-каналів", group: "Блоки головної" },
  { key: "title_reviews", label: "Відгуки: заголовок", default: "Відгуки", group: "Блоки головної" },
  { key: "title_map", label: "Контакти: заголовок", default: "Контакти", group: "Блоки головної" },
];

// Російські відповідники: ті самі ключі з «_ru». Порожнє значення — показуємо українське.
const RU_DEFAULTS: Record<string, string> = {
  badge_hit: "ХИТ",
  badge_new: "НОВОЕ",
  title_hits: "Популярное",
  title_full_menu: "Каталог",
  nav_hity: "Популярное",
  nav_novynky: "Новинки",
  nav_aktsii: "Акции",
  cart_extras: "Дополнительно",
  about_title: "О нас",
  about_text: ABOUT_DEFAULT_RU,
  title_hero_social: "Мы в соцсетях",
  title_hero_videos: "Видеогалерея",
  title_clients: "Наши клиенты",
  subtitle_clients: "Фото и отзывы тех, кто уже носит наш мерч",
  title_news: "Новости",
  subtitle_news: "Последние посты из наших Telegram-каналов",
  title_reviews: "Отзывы",
  title_map: "Контакты",
};

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  ...BASE_ENTRIES,
  ...BASE_ENTRIES.map((e) => ({
    ...e,
    key: `${e.key}_ru`,
    label: `${e.label} (RU)`,
    default: RU_DEFAULTS[e.key] ?? e.default,
    group: `${e.group} · RU`,
  })),
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
