-- =============================================================================
--  ІСІХАСТ — оригінальна назва Telegram-каналу.
-- =============================================================================
--  title_auto — назва, як вона задана в самому каналі (тягне крон).
--  title      — необовʼязкове перевизначення для сайту; порожнє → показуємо title_auto.
-- =============================================================================

alter table public.tg_channels
  add column if not exists title_auto text;

comment on column public.tg_channels.title is 'Ручний підпис на сайті; порожньо — беремо title_auto з Telegram';
comment on column public.tg_channels.title_auto is 'Назва каналу з Telegram (оновлює крон)';

-- прибираємо підписи, вигадані вручну — далі підтягнеться оригінал
update public.tg_channels set title = null;
