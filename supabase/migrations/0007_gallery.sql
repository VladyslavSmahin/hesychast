-- =============================================================================
--  ІСІХАСТ — галерея клієнтів: фото покупців і (за бажанням) їхні відгуки.
-- =============================================================================
--  Один запис = одне фото; текст і підпис автора необовʼязкові
--  (буває просто фото, буває фото + відгук). Показуємо слайдером на головній.
-- =============================================================================

create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null,
  author_name text,
  text        text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.gallery_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'gallery_items' and policyname = 'gallery_read') then
    create policy gallery_read   on public.gallery_items for select using (is_active or public.is_staff());
    create policy gallery_insert on public.gallery_items for insert with check (public.is_staff());
    create policy gallery_update on public.gallery_items for update using (public.is_staff()) with check (public.is_staff());
    create policy gallery_delete on public.gallery_items for delete using (public.is_admin());
  end if;
end $$;
