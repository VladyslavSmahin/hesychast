-- =============================================================================
--  ІСІХАСТ — двомовний контент каталогу (українська + російська).
-- =============================================================================
--  Базові поля (name, description) — українською: це мова сайту за замовчуванням.
--  Поля *_ru заповнюються в адмінці; порожні — показуємо українську версію.
-- =============================================================================

alter table public.products
  add column if not exists name_ru        text,
  add column if not exists description_ru text,
  add column if not exists weight_ru      text;

alter table public.categories
  add column if not exists name_ru text;

comment on column public.products.name_ru is 'Назва російською; порожньо — беремо name';
comment on column public.categories.name_ru is 'Назва російською; порожньо — беремо name';
