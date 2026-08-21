-- =============================================================================
--  ІСІХАСТ — три статуси наявності товару замість булевого is_available.
-- =============================================================================
--  in_stock     — в наявності (звичайний товар на вітрині)
--  preorder     — передзамовлення (показуємо на сайті з поміткою про можливу
--                 затримку; деталі узгоджуються в особистих повідомленнях)
--  out_of_stock — немає в наявності (на сайті не показуємо взагалі)
--
--  is_available залишаємо як похідну колонку — усі наявні публічні запити
--  (.eq("is_available", true)) продовжують працювати й показують товари
--  зі статусами in_stock та preorder.
-- =============================================================================

alter table public.products
  add column if not exists availability text not null default 'in_stock';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_availability_check'
  ) then
    alter table public.products
      add constraint products_availability_check
      check (availability in ('in_stock', 'preorder', 'out_of_stock'));
  end if;
end $$;

-- переносимо поточні значення: true → в наявності, false → немає
update public.products
   set availability = case when is_available then 'in_stock' else 'out_of_stock' end
 where availability = 'in_stock';

-- is_available → generated (щоб статус і видимість не могли розійтися)
alter table public.products drop column if exists is_available;
alter table public.products
  add column is_available boolean
  generated always as (availability <> 'out_of_stock') stored;

create index if not exists products_availability_idx on public.products (availability);
