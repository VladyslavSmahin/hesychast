-- =============================================================================
--  ІСІХАСТ — кілька фото на товар.
--  image_path лишається головним фото (картка, пошук, соцмережі);
--  images — додаткові фото в порядку показу. На вітрині: [image_path, ...images].
-- =============================================================================

alter table public.products
  add column if not exists images text[] not null default '{}';

comment on column public.products.images is
  'Додаткові фото товару (публічні URL у бакеті media) після головного image_path';
