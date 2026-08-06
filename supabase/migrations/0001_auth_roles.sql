-- =============================================================================
--  ІСИХАСТ — авторизація та ролі (без каталогу; решту БД будуємо пізніше).
--  Створює: allowed_staff (білий список), profiles (роль користувача),
--  хелпери ролей, тригер авто-створення профілю, RLS на ці дві таблиці.
--  Узгоджено з кодом: middleware / AdminAuthContext читають profiles.role.
-- =============================================================================

-- =====================================================================
--  ТАБЛИЦІ РОЛЕЙ
-- =====================================================================

-- білий список співробітників (хто має доступ в адмінку)
create table if not exists public.allowed_staff (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

-- привʼязка авторизованого користувача (auth.users) до ролі
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

-- =====================================================================
--  ХЕЛПЕРИ РОЛЕЙ (використовуються у RLS каталогу, який додамо пізніше)
-- =====================================================================

create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.user_role() = 'admin'; $$;

create or replace function public.is_staff()
returns boolean language sql stable as $$ select public.user_role() in ('admin','editor'); $$;

-- =====================================================================
--  АВТО-СТВОРЕННЯ ПРОФІЛЮ ПРИ ПЕРШОМУ ВХОДІ
--  Профіль створюється ЛИШЕ якщо email є у білому списку allowed_staff.
--  Інакше — доступу немає (middleware редіректить на /admin/login?denied=1).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select role into r from public.allowed_staff where lower(email) = lower(new.email);
  if r is null then
    return new; -- немає у білому списку → профіль не створюється
  end if;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, r)
  on conflict (id) do update set role = excluded.role;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.allowed_staff enable row level security;
alter table public.profiles      enable row level security;

-- allowed_staff: керує лише admin (через залогінену сесію); service_role обходить RLS
drop policy if exists allowed_staff_all on public.allowed_staff;
create policy allowed_staff_all on public.allowed_staff
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: користувач бачить себе; admin бачить усіх; змінює лише admin
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  СІД: перший адміністратор (розробник). Замінити/додати реальні email власника.
-- =====================================================================
insert into public.allowed_staff (email, role) values
  ('vladislavsmagin1@gmail.com', 'admin')
on conflict (email) do nothing;
