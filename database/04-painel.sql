begin;

create table public.store_theme (
  id boolean primary key default true check (id),
  primary_color text not null default '#942c20' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#2d482f' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  font text not null default 'system-ui' check (font in ('system-ui','Arial','Georgia','Verdana'))
);
insert into public.store_theme default values;
alter table public.store_theme enable row level security;
revoke all on public.store_theme from public, anon, authenticated;
grant select on public.store_theme to anon, authenticated;
grant update (primary_color, secondary_color, font) on public.store_theme to authenticated;
create policy theme_public on public.store_theme for select to anon, authenticated using (true);
create policy theme_edit on public.store_theme for update to authenticated
  using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));

create table public.store_views (
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  visitor uuid not null,
  path text not null check (path = '/' or path in ('/#doces','/#marmitas','/#sexta','/#porcoes','/#sobremesas','/#kits','/#lanches','/#pedidos')),
  views integer not null default 1 check (views between 1 and 25),
  primary key (day, visitor, path)
);
alter table public.store_views enable row level security;
revoke all on public.store_views from public, anon, authenticated;

create function public.store_record_view(p_visitor uuid, p_path text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((nullif(current_setting('request.headers', true), '')::jsonb)->>'origin', '') <> 'https://amostrasdesites.github.io' then
    return;
  end if;
  insert into public.store_views (visitor, path) values (p_visitor, p_path)
  on conflict (day, visitor, path) do update set views = public.store_views.views + 1
  where public.store_views.views < 25;
end;
$$;
revoke all on function public.store_record_view(uuid,text) from public, anon, authenticated;
grant execute on function public.store_record_view(uuid,text) to anon, authenticated;

create function public.store_analytics(p_days integer)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  first_day date;
  previous_day date;
begin
  if not public.is_catalog_admin() then
    raise exception 'Sem acesso às métricas' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (7,14,30) then
    raise exception 'Período inválido' using errcode = '22023';
  end if;
  first_day := today - p_days + 1;
  previous_day := first_day - p_days;
  return jsonb_build_object(
    'current', (select jsonb_build_object('views', coalesce(sum(views),0), 'visitors', count(distinct visitor)) from public.store_views where day between first_day and today),
    'prior', (select jsonb_build_object('views', coalesce(sum(views),0), 'visitors', count(distinct visitor)) from public.store_views where day >= previous_day and day < first_day),
    'paths', (select coalesce(jsonb_agg(to_jsonb(p) order by p.views desc,p.path),'[]'::jsonb) from
      (select path,sum(views) views from public.store_views where day between first_day and today group by path limit 10) p),
    'series', (select jsonb_agg(jsonb_build_object('day',first_day + d.ord,'views',coalesce(daily.views, 0)) order by d.ord)
      from generate_series(0,p_days-1) d(ord) left join
      (select day,sum(views) views from public.store_views where day between first_day and today group by day) daily
      on daily.day = first_day + d.ord)
  );
end;
$$;
revoke all on function public.store_analytics(integer) from public, anon, authenticated;
grant execute on function public.store_analytics(integer) to authenticated;
commit;
