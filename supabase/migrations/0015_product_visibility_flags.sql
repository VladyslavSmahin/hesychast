-- =============================================================================
--  ІСІХАСТ — два прапорці видимості товару (незалежні, можна обидва разом):
--  hidden_in_menu — не показувати в каталозі (меню, новинки/хіти, категорії,
--                   «Додатково» в кошику); сторінка товару за посиланням лишається;
--  coming_soon    — показувати в стрічці «Скоро в продажу» під меню; купити не можна.
-- =============================================================================

alter table public.products
  add column if not exists hidden_in_menu boolean not null default false,
  add column if not exists coming_soon    boolean not null default false;

comment on column public.products.hidden_in_menu is 'Сховати з каталогу (меню, категорії, новинки)';
comment on column public.products.coming_soon is 'Показати в стрічці «Скоро в продажу»; замовити не можна';
