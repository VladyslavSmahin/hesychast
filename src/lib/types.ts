// Типи даних сайту. Узгоджені зі схемою БД (див. ARCHITECTURE.md §4).

export type Badge = "ХІТ" | "НОВЕ" | "";

export interface Product {
  id: string;
  /** ЧПУ-ідентифікатор для адреси сторінки товару: /tovar/<slug> */
  slug: string;
  name: string;
  /** опис товару (картка, модалка, сторінка) */
  desc: string;
  /** поточна ціна (акційна, якщо на товар діє активна акція) */
  price: number;
  /** звичайна ціна до акції (показуємо закресленою); відсутня — акції немає */
  oldPrice?: number;
  /** напр. «0.5 л», «250 г» */
  weight: string;
  /** бейдж картки; «ХІТ» також додає товар у блок «Хіти» */
  badge: Badge;
  /** основна категорія (slug) */
  category: string;
  /** шлях до фото або null (плейсхолдер) */
  photo: string | null;
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
  id: string;
  name: string;
  price: number;
  /** звичайна ціна до акції (закреслена в кошику); відсутня — акції немає */
  oldPrice?: number;
  qty: number;
}
