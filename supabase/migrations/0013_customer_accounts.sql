-- =============================================================================
--  ІСІХАСТ — акаунти покупців.
--  Раніше профіль створювався лише для email з білого списку (allowed_staff).
--  Тепер профіль є в кожного зареєстрованого: роль 'customer' за замовчуванням,
--  'admin'/'editor' — якщо email у allowed_staff. Адмінка як і раніше доступна
--  лише staff (is_staff() не змінюється).
--  Додає: особисті дані в profiles, user_id у orders/reviews, RLS «бачу своє»,
--  синхронізацію ролі з allowed_staff і захист ролі від зміни самим користувачем.
-- =============================================================================

-- ---------- profiles: роль customer + особисті дані ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin','editor','customer'));
alter table public.profiles alter column role set default 'customer';

alter table public.profiles
  add column if not exists full_name       text,
  add column if not exists phone           text,
  add column if not exists default_address text,   -- підставляється в коментар до замовлення
  add column if not exists updated_at      timestamptz not null default now();

-- ---------- тригер: профіль для кожного нового користувача ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select role into r from public.allowed_staff where lower(email) = lower(new.email);
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id, new.email, coalesce(r, 'customer'),
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), '')
  )
  on conflict (id) do update set role = excluded.role;
  return new;
end; $$;

-- email у профілі слідує за auth.users (зміна email у кабінеті підтверджується листом)
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end; $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- користувачі, які заходили раніше без профілю (не з білого списку), стають customer
insert into public.profiles (id, email, role, full_name)
select u.id, u.email, coalesce(s.role, 'customer'),
       nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), '')
from auth.users u
left join public.allowed_staff s on lower(s.email) = lower(u.email)
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------- роль = allowed_staff: зміна списку діє одразу, без повторного входу ----------
create or replace function public.sync_staff_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set role = 'customer' where lower(email) = lower(old.email);
    return old;
  end if;
  if tg_op = 'UPDATE' and lower(old.email) <> lower(new.email) then
    update public.profiles set role = 'customer' where lower(email) = lower(old.email);
  end if;
  update public.profiles set role = new.role where lower(email) = lower(new.email);
  return new;
end; $$;

drop trigger if exists on_allowed_staff_change on public.allowed_staff;
create trigger on_allowed_staff_change
  after insert or update or delete on public.allowed_staff
  for each row execute function public.sync_staff_role();

-- ---------- захист: покупець править лише свої особисті поля ----------
-- RLS не обмежує стовпці, тому роль/email/id фіксуємо тригером. Міняти їх можуть
-- admin (через сесію), service_role і функції-власники (тригери вище).
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role')
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    new.id    := old.id;
    new.role  := old.role;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- замовлення й відгуки привʼязуються до акаунта ----------
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id);

alter table public.reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- покупець бачить свої замовлення (staff і далі бачить усі — політики складаються через OR)
drop policy if exists orders_read_own on public.orders;
create policy orders_read_own on public.orders
  for select using (user_id = auth.uid());

drop policy if exists order_items_read_own on public.order_items;
create policy order_items_read_own on public.order_items
  for select using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
  ));
