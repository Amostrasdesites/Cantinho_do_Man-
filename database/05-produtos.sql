begin;
create table public.store_product_views (
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  visitor uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(day,visitor,product_id)
);
create table public.store_sales (
  id bigint generated always as identity primary key,
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  product_id uuid not null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 999)
);
create index store_sales_day on public.store_sales(day);
alter table public.store_product_views enable row level security;
alter table public.store_sales enable row level security;
revoke all on public.store_product_views, public.store_sales from public, anon, authenticated;

create function public.store_record_product_view(p_visitor uuid,p_product uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((nullif(current_setting('request.headers',true),'')::jsonb)->>'origin','') <> 'https://amostrasdesites.github.io' then
    return;
  end if;
  insert into public.store_product_views(visitor,product_id)
    select p_visitor,p.id from public.products p where p.id=p_product and p.active
    on conflict do nothing;
end;
$$;
revoke all on function public.store_record_product_view(uuid,uuid) from public, anon, authenticated;
grant execute on function public.store_record_product_view(uuid,uuid) to anon, authenticated;

create function public.store_record_sale(p_product uuid,p_quantity integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_catalog_admin() then raise exception 'Sem acesso ao registro de vendas' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 999 then raise exception 'Quantidade inválida' using errcode='22023'; end if;
  insert into public.store_sales(product_id,product_name,quantity)
    select id,name,p_quantity from public.products where id=p_product;
  if not found then raise exception 'Produto indisponível' using errcode='22023'; end if;
end;
$$;
revoke all on function public.store_record_sale(uuid,integer) from public, anon, authenticated;
grant execute on function public.store_record_sale(uuid,integer) to authenticated;

create function public.store_product_rankings(p_days integer)
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
      from public.store_sales v left join public.products p on p.id=v.product_id where v.day>=start_day
      group by v.product_id order by total desc,1,v.product_id limit 10) s));
end;
$$;
revoke all on function public.store_product_rankings(integer) from public, anon, authenticated;
grant execute on function public.store_product_rankings(integer) to authenticated;
commit;
