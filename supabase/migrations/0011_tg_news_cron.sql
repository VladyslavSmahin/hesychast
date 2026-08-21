-- =============================================================================
--  ІСІХАСТ — планувальник новин на боці Supabase (pg_cron + pg_net).
-- =============================================================================
--  Vercel Hobby дозволяє крон лише раз на добу, тому розклад тримаємо в БД:
--  pg_cron кожні 5 годин смикає наш /api/cron/tg-news, а pg_net робить HTTP-запит.
--
--  Адреса сайту й секрет лежать у settings (key='cron_config'):
--    {"url": "https://<домен>", "secret": "<CRON_SECRET>"}
--  Заповнюються скриптом scripts/setup_cron.mjs (у репозиторій секрет не потрапляє).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.tg_news_cron_tick()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg     jsonb;
  api_url text;
  secret  text;
begin
  select value into cfg from public.settings where key = 'cron_config';
  if cfg is null then
    raise notice 'cron_config не заданий — пропускаю';
    return;
  end if;

  api_url := trim(trailing '/' from (cfg->>'url')) || '/api/cron/tg-news';
  secret  := cfg->>'secret';

  perform net.http_get(
    url     => api_url,
    headers => jsonb_build_object('Authorization', 'Bearer ' || coalesce(secret, ''))
  );
end;
$$;

comment on function public.tg_news_cron_tick is
  'Смикає /api/cron/tg-news — оновлення стрічки новин з Telegram (запускає pg_cron)';

-- перестворюємо розклад: кожні 5 годин
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tg_news_sync') then
    perform cron.unschedule('tg_news_sync');
  end if;
  perform cron.schedule('tg_news_sync', '0 */5 * * *', 'select public.tg_news_cron_tick();');
end $$;
