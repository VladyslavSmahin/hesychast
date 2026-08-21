// Типи даних сайту. Узгоджені зі схемою БД (див. ARCHITECTURE.md §4).

export type Badge = "ХІТ" | "НОВЕ" | "";

/**
 * Наявність товару:
 *  in_stock     — в наявності;
 *  preorder     — передзамовлення (товар видно, але можлива затримка — деталі в особистих);
 *  out_of_stock — немає в наявності (на сайті не показується).
 */
export type Availability = "in_stock" | "preorder" | "out_of_stock";

/** Колір одягу: назва + HEX для свотча. */
export interface ProductColor {
  name: string;
  hex: string;
}

/** Наклейка на одяг — спільна бібліотека картинок (таблиця stickers). */
export interface Sticker {
  id: string;
  name: string;
  image: string;
}

/** Вибрані покупцем опції позиції (розмір/колір/наклейка). */
export interface CartOptions {
  size?: string;
  color?: string;
  /** назва наклейки; відсутня — «без наклейки» */
  sticker?: string;
  /** доплата за наклейку, грн (уже врахована в ціні позиції) */
  stickerPrice?: number;
}

export interface Product {
  id: string;
  /** ЧПУ-ідентифікатор для адреси сторінки товару: /tovar/<slug> */
  slug: string;
  name: string;
  /** назва російською; порожньо — показуємо name */
  nameRu?: string | null;
  /** опис товару (картка, модалка, сторінка) */
  desc: string;
  /** опис російською */
  descRu?: string | null;
  /** поточна ціна (акційна, якщо на товар діє активна акція) */
  price: number;
  /** звичайна ціна до акції (показуємо закресленою); відсутня — акції немає */
  oldPrice?: number;
  /** напр. «0.5 л», «250 г» */
  weight: string;
  /** вага/обʼєм російською */
  weightRu?: string | null;
  /** бейдж картки; «ХІТ» також додає товар у блок «Хіти» */
  badge: Badge;
  /** основна категорія (slug) */
  category: string;
  /** шлях до фото або null (плейсхолдер) */
  photo: string | null;
  /** наявність; на вітрину потрапляють лише in_stock та preorder */
  availability: Availability;
  /** доступні розміри одягу; порожньо — селектора немає */
  sizes: string[];
  /** доступні кольори одягу; порожньо — селектора немає */
  colors: ProductColor[];
  /** чи можна додати наклейку з бібліотеки */
  stickerOption: boolean;
  /** доплата за наклейку, грн */
  stickerPrice: number;
  /** картинка з розмірною сіткою або null */
  sizeChart: string | null;
}

/** Банер головної сторінки (Hero-слайдер). Просто картинка, без кліку/ціни. */
export interface Banner {
  id: string;
  /** публічний URL зображення (WebP у Supabase Storage) */
  image: string;
}

export interface NavCategory {
  id: string;
  label: string;
  filter?: { category?: string; badge?: Badge };
  scrollTo?: string;
}

export interface CartItem {
  /** ключ позиції: id товару + вибрані опції (різні опції = різні рядки кошика) */
  id: string;
  /** id товару в БД (для перевірки ціни на сервері) */
  productId: string;
  name: string;
  price: number;
  /** звичайна ціна до акції (закреслена в кошику); відсутня — акції немає */
  oldPrice?: number;
  qty: number;
  /** вибрані розмір / колір / наклейка */
  options?: CartOptions;
}

/** Пост із відкритого Telegram-каналу (блок «Новини» на головній). */
export interface NewsPost {
  id: string;
  /** підпис каналу на сайті */
  channel: string;
  channelUsername: string;
  text: string;
  image: string | null;
  link: string;
  postedAt: string | null;
}

/** Фото клієнта у галереї; текст і підпис — необовʼязкові (фото або фото + відгук). */
export interface GalleryItem {
  id: string;
  image: string;
  author: string;
  text: string;
}

/** Відео клієнта (рілс/відгук). Постер — перший кадр, підпис і текст — необовʼязкові. */
export interface VideoItem {
  id: string;
  video: string;
  poster: string | null;
  author: string;
  text: string;
}
