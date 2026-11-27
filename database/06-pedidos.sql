begin;

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  created_at timestamptz not null default now(),
  customer text not null check (char_length(btrim(customer)) between 1 and 100),
  phone text not null check (char_length(phone) <= 24 and char_length(regexp_replace(phone,'[^0-9]','','g')) between 10 and 15),
  payment text not null check (payment in ('pending','paid','canceled')),
  delivery text not null check (delivery in ('waiting','preparing','sent','delivered','issue','canceled')),
  tracking text not null default '' check (tracking = '' or (char_length(tracking) <= 500 and tracking ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
  items jsonb not null check (jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 20)
);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from public, anon, authenticated;
grant select on public.store_orders to authenticated;
create policy store_orders_read on public.store_orders for select to authenticated
  using ((select public.is_catalog_admin()));

create function public.store_save_order(p_order jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  saved public.store_orders;
  existing public.store_orders;
  entry jsonb;
  previous_item jsonb;
  product public.products;
  confirmed_items jsonb := '[]'::jsonb;
  order_id uuid := coalesce(nullif(p_order->>'id','')::uuid,gen_random_uuid());
  product_id uuid;
  quantity integer;
begin
  if not public.is_catalog_admin() then
    raise exception 'Sem acesso aos pedidos.' using errcode='42501';
  end if;
  if jsonb_typeof(p_order->'items') is distinct from 'array'
    or jsonb_array_length(p_order->'items') not between 1 and 20 then
    raise exception 'Informe de 1 a 20 itens.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(order_id::text,0));
  select * into existing from public.store_orders where id=order_id for update;
  for entry in select value from jsonb_array_elements(p_order->'items') loop
    product_id := (entry->>'id')::uuid;
    quantity := (entry->>'quantity')::integer;
    if quantity is null or quantity not between 1 and 999 then
      raise exception 'Informe uma quantidade de 1 a 999.' using errcode='22023';
    end if;
    select value into previous_item from jsonb_array_elements(existing.items) where value->>'id'=product_id::text limit 1;
    if previous_item is null then
      select * into product from public.products where id=product_id;
      if not found then raise exception 'Produto indisponível.' using errcode='22023'; end if;
      previous_item := jsonb_build_object('id',product.id,'name',product.name,'image',product.image,'price_cents',product.price_cents);
    end if;
    confirmed_items := confirmed_items || jsonb_build_array(previous_item || jsonb_build_object('quantity',quantity));
  end loop;
  insert into public.store_orders(id,customer,phone,payment,delivery,tracking,items) values
    (order_id,btrim(p_order->>'customer'),p_order->>'phone',p_order->>'payment',p_order->>'delivery',coalesce(p_order->>'tracking',''),confirmed_items)
    on conflict(id) do update set customer=excluded.customer,phone=excluded.phone,payment=excluded.payment,
      delivery=excluded.delivery,tracking=excluded.tracking,items=excluded.items
    returning * into saved;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.store_save_order(jsonb) from public, anon, authenticated;
grant execute on function public.store_save_order(jsonb) to authenticated;

create or replace function public.store_product_rankings(p_days integer)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare start_day date;
begin
  if not public.is_catalog_admin() then raise exception 'Sem acesso às métricas' using errcode='42501'; end if;
  if p_days is null or p_days not in (7,14,30) then raise exception 'Período inválido' using errcode='22023'; end if;
  start_day := (now() at time zone 'America/Sao_Paulo')::date-p_days+1;
  return jsonb_build_object(
    'product_views', (select coalesce(jsonb_agg(to_jsonb(r) order by r.total desc,r.name),'[]'::jsonb) from
      (select p.name,count(*) total from public.store_product_views v join public.products p on p.id=v.product_id
      where v.day>=start_day group by p.id,p.name order by total desc,p.name,p.id limit 10) r),
    'product_sales', (select coalesce(jsonb_agg(to_jsonb(s) order by s.total desc,s.name),'[]'::jsonb) from
      (select coalesce(max(p.name),(array_agg(v.product_name order by v.id desc))[1]) name,sum(v.quantity) total
      from (
        select id, day, product_id, product_name, quantity from public.store_sales
        union all
        select o.number, (o.created_at at time zone 'America/Sao_Paulo')::date, (item->>'id')::uuid, item->>'name', (item->>'quantity')::integer
        from public.store_orders o cross join lateral jsonb_array_elements(o.items) item
        where o.payment='paid' and o.delivery<>'canceled'
      ) v left join public.products p on p.id=v.product_id where v.day>=start_day
      group by v.product_id order by total desc,1,v.product_id limit 10) s));
end;
$$;

commit;
