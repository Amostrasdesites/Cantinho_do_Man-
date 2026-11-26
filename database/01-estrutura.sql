begin;

create table public.catalog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.catalog_admins enable row level security;
revoke all on public.catalog_admins from public, anon, authenticated;

create function public.is_catalog_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.catalog_admins where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_catalog_admin() from public, anon, authenticated;
grant execute on function public.is_catalog_admin() to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('marmitas','sexta','porcoes','sobremesas','kits','lanches')),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  price_cents integer not null check (price_cents between 0 and 999999999),
  cost_cents integer check (cost_cents between 0 and 999999999),
  image text not null default '' check (
    char_length(image) <= 500 and
    (image = '' or image ~ '^https://' or image ~ '^assets/img/[a-zA-Z0-9_-]+[.]webp$')
  ),
  tags varchar(35)[] not null default '{}' check (cardinality(tags) <= 15 and array_position(tags, null) is null),
  starting boolean not null default false,
  active boolean not null default true,
  position integer not null default 0 check (position >= 0)
);
create index products_position_idx on public.products (position, id);
alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;

create policy catalog_admin_manages_products on public.products
  for all to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

create function public.catalog_public()
returns table (
  id uuid, category text, name text, description text, price_cents integer,
  image text, tags varchar(35)[], starting boolean, "position" integer
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.category, p.name, p.description, p.price_cents,
    p.image, p.tags, p.starting, p.position
  from public.products as p
  where p.active;
$$;
revoke all on function public.catalog_public() from public, anon, authenticated;
grant execute on function public.catalog_public() to anon, authenticated;

commit;
