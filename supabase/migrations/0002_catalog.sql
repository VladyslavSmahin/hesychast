-- =============================================================================
--  ІСИХАСТ — спрощений каталог та замовлення.
--  Потребує 0001_auth_roles.sql (хелпери is_staff/is_admin, ролі).
--  БЕЗ інгредієнтів / підкатегорій / промокодів / КБЖУ / історії цін.
--  Товар = назва + ціна + опис + вага + фото + категорія. Акції та банери — є.
-- =============================================================================

create extension if not exists pgcrypto;

-- =====================================================================
--  КАТАЛОГ
-- =====================================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  sort_order  int  not null default 0,
  show_in_nav boolean not null default true,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null,
  slug         text not null unique,
  description  text,                       -- опис товару (опційно)
  price        numeric(10,2) not null default 0,
  weight       text,                       -- напр. «0.5 л», «250 г» (опційно)
  badge        text check (badge in ('ХІТ','НОВЕ') or badge is null),
  image_path   text,                       -- публічний URL фото (Storage, бакет media) або null
  is_available boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);

-- Акції: акційна ціна на товар у межах дат.
create table if not exists public.promos (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  promo_price  numeric(10,2) not null,
  valid_from   timestamptz,
  valid_until  timestamptz,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists promos_product_idx on public.promos (product_id);

-- Банери головної (Hero-слайдер): просто картинка (акційне фото).
create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- =====================================================================
--  ЗАМОВЛЕННЯ / ВІДГУКИ
-- =====================================================================

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone         text not null,
  delivery_type text not null check (delivery_type in ('delivery','pickup')),
  address       text,
  comment       text,
  status        text not null default 'new' check (status in ('new','confirmed','done','canceled')),
  subtotal      numeric(10,2) not null default 0,
  delivery_cost numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  pd_consent_at timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,           -- знімок назви на момент замовлення
  price        numeric(10,2) not null,  -- знімок ціни
  quantity     int not null check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  contact     text not null,
  rating      int check (rating between 1 and 5),
  text        text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

-- =====================================================================
--  updated_at для settings
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
--  RLS: читати — публічно; insert/update — staff; delete — admin.
--  orders/order_items пишуться через service-role (обходить RLS).
-- =====================================================================
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.promos      enable row level security;
alter table public.banners     enable row level security;
alter table public.settings    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','products'] loop
    execute format('create policy %I_read   on public.%I for select using (true);', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.is_staff());', t, t);
    execute format('create policy %I_update on public.%I for update using (public.is_staff()) with check (public.is_staff());', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.is_admin());', t, t);
  end loop;
end $$;

-- promos / banners: публічно лише активні; staff бачить усі
create policy promos_read   on public.promos  for select using (is_active or public.is_staff());
create policy promos_insert on public.promos  for insert with check (public.is_staff());
create policy promos_update on public.promos  for update using (public.is_staff()) with check (public.is_staff());
create policy promos_delete on public.promos  for delete using (public.is_admin());

create policy banners_read   on public.banners for select using (is_active or public.is_staff());
create policy banners_insert on public.banners for insert with check (public.is_staff());
create policy banners_update on public.banners for update using (public.is_staff()) with check (public.is_staff());
create policy banners_delete on public.banners for delete using (public.is_staff());

-- settings: публічне читання, запис лише staff
create policy settings_read   on public.settings for select using (true);
create policy settings_insert on public.settings for insert with check (public.is_staff());
create policy settings_update on public.settings for update using (public.is_staff()) with check (public.is_staff());

-- orders / order_items: читання/зміна — staff, видалення — admin (insert — service role)
create policy orders_read   on public.orders for select using (public.is_staff());
create policy orders_update on public.orders for update using (public.is_staff()) with check (public.is_staff());
create policy orders_delete on public.orders for delete using (public.is_admin());
create policy order_items_read on public.order_items for select using (public.is_staff());

-- reviews: публічно лише approved; прямий insert — лише staff (прийом через /api/review service role)
create policy reviews_read   on public.reviews for select using (status = 'approved' or public.is_staff());
create policy reviews_insert on public.reviews for insert with check (public.is_staff());
create policy reviews_update on public.reviews for update using (public.is_staff()) with check (public.is_staff());
create policy reviews_delete on public.reviews for delete using (public.is_admin());

-- =====================================================================
--  СІД: стартові категорії та кілька товарів (щоб вітрина показала реальні дані)
-- =====================================================================
insert into public.categories (name, slug, sort_order) values
  ('Пасіка',           'pasika',   10),
  ('Церковне начиння', 'cerkovne', 20),
  ('Мерч',             'merch',    30)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, weight, badge)
select c.id, v.name, v.slug, v.description, v.price, v.weight, v.badge
from (values
  ('pasika',   'Мед квітковий',       'med-kvitkovyi',  'Натуральний квітковий мед з власної пасіки.',  180, '0.5 л', 'ХІТ'),
  ('pasika',   'Мед липовий',         'med-lypovyi',    'Липовий мед, зібраний у період цвітіння липи.',220, '0.5 л', null),
  ('pasika',   'Прополіс',            'propolis',       'Бджолиний прополіс, натуральний.',             120, '30 г',  'НОВЕ'),
  ('cerkovne', 'Свічки воскові',      'svichky-voskovi','Свічки з натурального бджолиного воску.',       60, '10 шт', 'ХІТ'),
  ('cerkovne', 'Ладан єрусалимський', 'ladan',          'Ароматний ладан для домашньої молитви.',        90, '50 г',  null),
  ('merch',    'Футболка з хрестом',  'futbolka-khrest','Бавовняна футболка з вишитим хрестом.',        450, null,    'НОВЕ')
) as v(cat_slug, name, slug, description, price, weight, badge)
join public.categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;
