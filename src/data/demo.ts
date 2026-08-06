// =============================================================================
//  ІСИХАСТ — ДЕМО-КАТАЛОГ (тимчасовий)
//  Використовується у publicData.server, ЛИШЕ коли в Supabase ще немає товарів
//  (порожня БД). Дає контент для роботи над версткою. Коли побудуємо реальну БД
//  і зʼявляться товари — цей фолбек автоматично перестане використовуватись.
//  Пізніше файл можна видалити.
// =============================================================================

import type { Product } from "@/lib/types";
import type { PubCategory, PubReview } from "@/features/publicData";

export const demoCategories: PubCategory[] = [
  { id: "c-pasika",   name: "Пасіка",           slug: "pasika",   sortOrder: 10, showInNav: true, isActive: true },
  { id: "c-cerkovne", name: "Церковне начиння", slug: "cerkovne", sortOrder: 20, showInNav: true, isActive: true },
  { id: "c-merch",    name: "Мерч",             slug: "merch",    sortOrder: 30, showInNav: true, isActive: true },
];

const P = (
  id: string, name: string, price: number, category: string,
  desc: string, weight = "", badge: Product["badge"] = "",
): Product => ({
  // slug демо-товару = id без префікса «p-» (демо-каталог теж має працювати на /tovar/<slug>)
  id, slug: id.replace(/^p-/, ""), name, desc, price, weight, badge, category, photo: null,
});

export const demoProducts: Product[] = [
  // Пасіка
  P("p-med-kvit", "Мед квітковий",  180, "pasika", "Натуральний квітковий мед з власної пасіки.", "0.5 л", "ХІТ"),
  P("p-med-lypa", "Мед липовий",    220, "pasika", "Липовий мед, зібраний у період цвітіння липи.", "0.5 л"),
  P("p-med-grech","Мед гречаний",   200, "pasika", "Темний гречаний мед з насиченим смаком.", "0.5 л"),
  P("p-propolis", "Прополіс",       120, "pasika", "Бджолиний прополіс, натуральний.", "30 г", "НОВЕ"),
  // Церковне начиння
  P("p-ladan",    "Ладан єрусалимський", 90,  "cerkovne", "Ароматний ладан для домашньої молитви.", "50 г"),
  P("p-svichky",  "Свічки воскові",      60,  "cerkovne", "Свічки з натурального бджолиного воску.", "10 шт", "ХІТ"),
  P("p-ikona",    "Ікона Спасителя",     350, "cerkovne", "Освячена ікона, дерев'яна основа.", ""),
  // Мерч
  P("p-tshirt",   "Футболка з хрестом",  450, "merch", "Бавовняна футболка з вишитим хрестом.", "", "НОВЕ"),
  P("p-cap",      "Кепка «ІСИХАСТ»",    350, "merch", "Кепка з логотипом крамниці.", ""),
];

export const demoReviews: PubReview[] = [
  { id: "r1", authorName: "Олена",  rating: 5, text: "Мед неймовірно смачний, дякую!", createdAt: new Date().toISOString() },
  { id: "r2", authorName: "Андрій", rating: 5, text: "Швидка доставка, все освячене та якісне.", createdAt: new Date().toISOString() },
  { id: "r3", authorName: "Марія",  rating: 5, text: "Свічки чудові, беру вже вдруге.", createdAt: new Date().toISOString() },
];
