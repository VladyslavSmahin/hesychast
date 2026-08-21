-- =============================================================================
--  ІСІХАСТ — відеогалерея клієнтів (рілси/відгуки у відео).
-- =============================================================================
--  Відео лежить у Storage (bucket media, папка videos), тут — лише посилання,
--  постер (перший кадр) і необовʼязковий підпис/відгук.
-- =============================================================================

create table if not exists public.video_items (
  id          uuid primary key default gen_random_uuid(),
  video_path  text not null,
  poster_path text,
  author_name text,
  text        text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.video_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'video_items' and policyname = 'video_read') then
    create policy video_read   on public.video_items for select using (is_active or public.is_staff());
    create policy video_insert on public.video_items for insert with check (public.is_staff());
    create policy video_update on public.video_items for update using (public.is_staff()) with check (public.is_staff());
    create policy video_delete on public.video_items for delete using (public.is_admin());
  end if;
end $$;
