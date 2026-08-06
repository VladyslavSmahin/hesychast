-- =============================================================================
--  ІСИХАСТ — способи доставки: перевізник замість «доставка/самовивіз».
--  Самовивозу немає (крамниця відправляє поштою), вартість доставки не рахуємо
--  взагалі — її називає менеджер при підтвердженні замовлення.
-- =============================================================================

-- 1) delivery_type тепер зберігає перевізника
alter table public.orders drop constraint if exists orders_delivery_type_check;

-- старі значення (якщо десь лишились) переводимо на «інше»
update public.orders
   set delivery_type = case
         when delivery_type in ('nova_poshta', 'ukrposhta', 'other') then delivery_type
         else 'other'
       end;

alter table public.orders
  add constraint orders_delivery_type_check
  check (delivery_type in ('nova_poshta', 'ukrposhta', 'other'));

-- 2) вартість доставки більше не рахується й ніде не показується
alter table public.orders drop column if exists delivery_cost;

comment on column public.orders.delivery_type is 'Перевізник: nova_poshta | ukrposhta | other';
comment on column public.orders.address is 'Місто та відділення (або спосіб доставки, якщо обрано «інше»)';
