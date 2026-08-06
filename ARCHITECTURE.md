# ІСИХАСТ — архитектура

Техническое описание того, что реально есть в коде и в базе.
Статус работ и роадмап — в `STATUS.md`, история решений — в `PLAN.md`.

---

## 1. Что за система

Интернет-магазин одного продавца: православный мерч и продукты пасеки.
Покупатель собирает корзину и оформляет заказ без регистрации; заказ падает в
Telegram владельцу и в базу. Владелец через админку заводит товары, категории,
акции, баннеры, модерирует отзывы и ведёт заказы. Онлайн-оплаты нет — оплата при
получении, стоимость доставки менеджер считает вручную по адресу.

Проект собран копированием суши-шопа (`/Users/vladyslav/Documents/web-projects/sushi-shop/`)
с упрощением модели товара. Схема БД написана заново — **старые миграции суши-шопа
несовместимы** и лежат в `supabase/migrations/_archive_sushi/` только как справка.

---

## 2. Стек

| Слой | Решение |
|---|---|
| Фреймворк | Next.js 15 (App Router), React 19, TypeScript |
| Стили | CSS Modules + `globals.css` (CSS-переменные) + инлайн-стили в компонентах |
| БД / Auth / Storage | Supabase (Postgres + RLS, Google OAuth + пароль, бакет `media`) |
| Обработка картинок | `sharp` (сервер, WebP) + Canvas API (клиент, предварительное сжатие) |
| Уведомления | Telegram Bot API |
| Хостинг | Vercel (ещё не развёрнут), аналитика — `@vercel/analytics` + `speed-insights` |
| Разовые скрипты | Node + `pg` через session pooler (`scripts/`) |

Почему Supabase: закрывает БД, авторизацию и хранилище картинок одним бесплатным
сервисом — меньше внешних зависимостей и ключей. Раньше картинки жили в
Cloudflare R2 (наследие суши-шопа); в августе 2026 переехали в Supabase Storage,
R2 и `@aws-sdk/client-s3` удалены.

---

## 3. Структура кода

```
src/
├── app/
│   ├── page.tsx                    # главная: SSR-данные → HomeClient (force-dynamic)
│   ├── layout.tsx                  # шрифты, метаданные, CartProvider, аналитика
│   ├── about/ oferta/ privacy/     # инфо-страницы
│   ├── admin/                      # админка (защищена middleware)
│   │   ├── page.tsx                # дашборд
│   │   ├── login/                  # вход: Google OAuth + пароль
│   │   ├── products/ categories/   # каталог
│   │   ├── promos/                 # акции + вкладка баннеров Hero
│   │   ├── orders/ orders/board/   # заказы: список и доска со статусами
│   │   ├── reviews/ staff/ glossary/
│   └── api/
│       ├── order/                  # приём заказа (цены из БД, rate-limit, Telegram)
│       ├── review/                 # приём отзыва (pending + Telegram)
│       ├── upload/                 # фото → WebP → Storage
│       ├── banners/                # баннер: загрузка + удаление (файл и строка)
│       ├── admin/staff/password/   # выдача пароля сотруднику (только admin)
│       └── auth/callback/          # OAuth-редирект Supabase
├── components/                     # витрина (Hero, FullMenu, MenuCard, CartDrawer, …)
│   └── admin/                      # переиспользуемые куски админки (Modal, Pagination, …)
├── features/
│   ├── publicData.server.ts        # единственный источник данных витрины (SSR)
│   ├── publicData.tsx              # Context для клиентских компонентов
│   ├── cart/CartContext.tsx        # корзина + localStorage
│   └── admin/                      # db.ts (CRUD-хуки), AdminAuthContext, кэш, пагинация
├── lib/
│   ├── supabase/                   # client / server / admin (service-role) / middleware
│   ├── storage.ts                  # Supabase Storage: put / delete / key-from-url
│   ├── imageUpload.ts              # sharp → WebP → storage
│   ├── clientImage.ts              # даунскейл на клиенте до отправки
│   ├── adminAuth.ts                # isStaff / isAdmin по роли из profiles
│   ├── telegram.ts, rateLimit.ts, slugify.ts, glossary.ts, navSpecials.ts
│   └── types.ts                    # Product, Promo, Banner, CartItem, …
├── data/site.ts                    # статика: контакты, тексты, иконки
├── data/demo.ts                    # демо-каталог (фолбек, пока БД пуста)
└── middleware.ts                   # гард /admin

supabase/migrations/
├── 0001_auth_roles.sql             # allowed_staff, profiles, хелперы ролей, триггер
├── 0002_catalog.sql                # каталог, акции, баннеры, заказы, отзывы, RLS
└── _archive_sushi/                 # миграции суши-шопа — НЕ применять
```

---

## 4. Схема базы

Всё в схеме `public`, RLS включён на всех таблицах.

**`categories`** — `id`, `name`, `slug` (unique), `sort_order`, `show_in_nav`, `is_active`.

**`products`** — `id`, `category_id` → `categories`, `name`, `slug` (unique),
`description`, `price`, `weight` («0.5 л», «250 г»), `badge` (`ХІТ` / `НОВЕ` / null),
`image_path` (публичный URL в бакете `media`), `is_available`, `sort_order`.
Ингредиентов, КБЖУ, состава, подкатегорий и soft-delete здесь **нет** — это
осознанное упрощение относительно суши-шопа.

**`promos`** — акция на товар: `product_id`, `promo_price`, `valid_from`,
`valid_until`, `is_active`, `sort_order`.

**`banners`** — картинки Hero-слайдера: `image_path`, `sort_order`, `is_active`.

**`settings`** — `key` (pk) + `value` (jsonb). Используемые ключи:
`glossary` (редактируемые подписи и тексты сайта), `nav_specials` (видимость
пунктов «Новинки»/«Акції»), `delivery` (тариф — остался от авторасчёта, сейчас
на витрине не применяется).

**`orders`** — `customer_name`, `phone`, `delivery_type` (`delivery`/`pickup`),
`address`, `comment`, `status` (`new`/`confirmed`/`done`/`canceled`), `subtotal`,
`delivery_cost` (всегда 0 — считает менеджер), `total`, `pd_consent_at`.
Полей промокода и скидки **нет**.

**`order_items`** — `order_id`, `product_id`, `product_name` и `price` как снимок
на момент заказа, `quantity`.

**`reviews`** — `author_name`, `contact`, `rating` (1–5), `text`,
`status` (`pending`/`approved`/`rejected`).

**`allowed_staff`** — белый список: `email` (unique) + `role` (`admin`/`editor`).
**`profiles`** — `id` → `auth.users`, `email`, `role`.

### RLS — правила доступа
- `categories`, `products`: чтение публичное; вставка и правка — `is_staff()`;
  удаление — `is_admin()`.
- `promos`, `banners`: публично видны только активные, staff видит все.
- `settings`: чтение публичное, запись — staff.
- `orders`, `order_items`: чтение и правка — staff, удаление — admin.
  Вставка идёт service-role ключом с сервера (в обход RLS).
- `reviews`: публично только `approved`; прямая вставка запрещена всем кроме
  staff — приём отзывов только через `/api/review` (service-role).

Хелперы `public.user_role()`, `is_admin()`, `is_staff()` (`security definer`)
читают роль из `profiles` и используются во всех политиках.

---

## 5. Авторизация и роли

1. Сотрудник заходит на `/admin/login` → Google OAuth (или email + пароль).
2. Триггер `handle_new_user` при первом входе создаёт строку в `profiles`
   **только если email есть в `allowed_staff`**. Нет в списке — нет профиля.
3. `middleware.ts` (matcher `/admin/:path*`) обновляет сессию и на **сервере**
   читает роль из `profiles`: нет сессии → редирект на логин; есть сессия, но не
   staff → `/admin/login?denied=1`. Клиентская проверка (`AdminAuthContext`) —
   только для UI, доступ решается на сервере.
4. Роли: `admin` — всё, включая удаление и выдачу паролей сотрудникам;
   `editor` — контент без удаления.
5. Пароль сотруднику задаёт админ через `/api/admin/staff/password` (роут сам
   создаёт auth-пользователя, если тот ещё не входил через Google).

---

## 6. Ключевые потоки

### Витрина
`app/page.tsx` (`force-dynamic`) → `fetchPublicData()` одним заходом тянет
категории, доступные товары, активные акции, баннеры, три ключа `settings` и
одобренные отзывы (6 параллельных запросов) → `PublicDataProvider` раздаёт данные
клиентским компонентам. Эффективная цена считается здесь же: активная акция в
пределах дат и ниже каталожной становится `price`, старая уходит в `oldPrice`.
Если товаров в БД нет — отдаётся демо-каталог из `src/data/demo.ts`.

### Заказ
`CartDrawer` → `POST /api/order` → rate-limit 6/мин по IP → валидация (обязательные
поля, согласие на ПД, ≤100 позиций, ≤100 шт. одной позиции, лимиты длины) →
**цены и названия перечитываются из БД по uuid** (присланная клиентом цена
игнорируется — защита от подмены), применяется акционная цена → запись в `orders`
и `order_items` service-role ключом → сообщение в Telegram. Если не сохранилось
ни в БД, ни в Telegram — `502`, и клиент не чистит корзину.

### Отзыв
`ReviewForm` → `POST /api/review` → rate-limit 4/мин → запись со статусом
`pending` + уведомление в Telegram → модерация в `/admin/reviews` → на витрину
попадают только `approved`.

### Загрузка изображения
Форма товара или панель баннеров → `downscaleImage()` на клиенте (Canvas → WebP,
обходит лимит тела запроса Vercel ~4.5 МБ) → `POST /api/upload` (или `/api/banners`)
→ проверка `isStaff()` → `sharp`: авто-поворот по EXIF, `fit: inside` до 1280 px
(товары) или 1600 px (баннеры), WebP q82 → `storagePut()` в бакет `media` под
именем `<папка>/<uuid>.webp` → публичный URL пишется в `products.image_path` или
`banners.image_path`. Если вставка строки баннера упала — файл подчищается.

Бакет `media` публичный на чтение (URL вида
`<supabase>/storage/v1/object/public/media/products/<uuid>.webp`, кэш на год),
запись возможна только service-role ключом с сервера.

---

## 7. Безопасность

- Цены заказа авторитетны на сервере; клиентские значения не используются.
- Service-role ключ только в серверных модулях (`server-only`), никогда не в браузер.
- Доступ к `/admin` решается на сервере по роли, не по клиентскому состоянию.
- Rate-limit на публичных API (in-memory по IP — сбрасывается при холодном старте;
  для строгого лимита нужен Redis).
- Лимиты длины полей и количества позиций во всех публичных роутах.
- Telegram-сообщения экранируются (`esc`), `dangerouslySetInnerHTML` не используется.
- Security-заголовки на все ответы в `next.config.mjs`: `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy`.
- Бакет ограничен по MIME (`image/*`) и размеру (8 МБ).

---

## 8. Известные особенности и долги

- **`Product` шире, чем нужно.** Тип и `mapProduct` тащат мёртвые поля от суши-шопа
  (`composition`, `pieces`, `ingredients`, `portion`, `subcategory`, `fullDesc`) —
  заполняются пустышками. Требуют чистки вместе с компонентами витрины.
- **`lib/delivery.ts`** и ключ `settings.delivery` остались от авторасчёта доставки
  по координатам; на чекауте не применяются (`delivery_cost` всегда 0).
- **Главная `force-dynamic`** — 6 запросов к БД на каждый заход. До наполнения
  каталога терпимо, дальше нужен ISR с инвалидацией из админки.
- **Нет отдельных URL** у товаров и категорий — весь каталог на `/`, товар в
  модалке. Главный блокер SEO (разбор — в `STATUS.md`).
- **Картинки через `<img>`**, не `next/image` — нет автоформатов и ленивой загрузки
  из коробки.
- **Миграции применяются скриптом**, а не `supabase db push` — таблица миграций
  Supabase рассинхронизирована намеренно.
