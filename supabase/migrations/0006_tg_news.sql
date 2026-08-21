-- =============================================================================
--  ІСІХАСТ — новини з відкритих Telegram-каналів.
-- =============================================================================
--  tg_channels — які публічні канали відстежуємо (керується в адмінці).
--  tg_posts    — останні пости, зібрані кроном із веб-версії t.me/s/<канал>.
--  Пости оновлює лише сервер (service role), сайт їх тільки читає.
-- =============================================================================

create table if not exists public.tg_channels (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,          -- без «@», напр. pravoslav_merch
  title       text,                          -- підпис на сайті (порожньо — @username)
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  last_sync_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.tg_posts (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.tg_channels(id) on delete cascade,
  post_id     int not null,                  -- номер поста в каналі (t.me/<канал>/<номер>)
  text        text,
  image_path  text,                          -- прев'ю з Telegram (може бути null)
  link        text not null,
  posted_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (channel_id, post_id)
);
create index if not exists tg_posts_posted_idx on public.tg_posts (posted_at desc);

alter table public.tg_channels enable row level security;
alter table public.tg_posts    enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'tg_channels' and policyname = 'tg_channels_read') then
    create policy tg_channels_read   on public.tg_channels for select using (is_active or public.is_staff());
    create policy tg_channels_insert on public.tg_channels for insert with check (public.is_staff());
    create policy tg_channels_update on public.tg_channels for update using (public.is_staff()) with check (public.is_staff());
    create policy tg_channels_delete on public.tg_channels for delete using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tg_posts' and policyname = 'tg_posts_read') then
    -- пости пише лише сервер (service role обходить RLS), решті — тільки читання
    create policy tg_posts_read on public.tg_posts for select using (true);
  end if;
end $$;

-- Стартові канали: мерч та особистий
insert into public.tg_channels (username, title, sort_order)
values ('pravoslav_merch', 'ІСІХАСТ · Мерч', 10),
       ('petrgolik',       'Отець Петро', 20)
on conflict (username) do nothing;
