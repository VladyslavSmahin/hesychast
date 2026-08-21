-- =============================================================================
--  ІСІХАСТ — опції одягу: розміри, кольори, наклейка та розмірна сітка.
-- =============================================================================
--  Опції живуть на товарі: якщо масиви порожні, а sticker_option = false —
--  товар звичайний (мед, свічки) і на вітрині жодних селекторів немає.
--  Наклейки — спільна бібліотека картинок (таблиця stickers), яку адмін
--  завантажує один раз і вмикає для потрібних товарів.
-- =============================================================================

alter table public.products
  add column if not exists sizes            text[]  not null default '{}',
  add column if not exists colors           jsonb   not null default '[]'::jsonb,
  add column if not exists sticker_option   boolean not null default false,
  add column if not exists sticker_price    numeric(10,2) not null default 0,
  add column if not exists size_chart_image text;

comment on column public.products.sizes is 'Доступні розміри, напр. {XS,S,M,L,XL,XXL}';
comment on column public.products.colors is 'Кольори: [{"name":"Білий","hex":"#FFFFFF"}]';
comment on column public.products.sticker_option is 'Дозволити вибір наклейки з бібліотеки stickers';
comment on column public.products.sticker_price is 'Доплата за наклейку, грн (0 — безкоштовно)';
comment on column public.products.size_chart_image is 'URL картинки з розмірною сіткою';

-- Бібліотека наклейок (спільна для всіх товарів одягу)
create table if not exists public.stickers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_path  text not null,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.stickers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'stickers' and policyname = 'stickers_read') then
    create policy stickers_read   on public.stickers for select using (is_active or public.is_staff());
    create policy stickers_insert on public.stickers for insert with check (public.is_staff());
    create policy stickers_update on public.stickers for update using (public.is_staff()) with check (public.is_staff());
    create policy stickers_delete on public.stickers for delete using (public.is_admin());
  end if;
end $$;

-- Вибрані опції зберігаємо знімком у позиції замовлення
alter table public.order_items
  add column if not exists options jsonb;

comment on column public.order_items.options is
  'Знімок вибраних опцій: {"size":"L","color":"Чорний","sticker":"Хрест","stickerPrice":75}';
