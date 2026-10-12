-- Limite de débit de l'API publique (/api/v1/public/*). À rejouer sur chaque base V2, dont la production.
--
-- Le compteur doit être partagé entre les instances serverless : un compteur en mémoire ne suffit pas sur Vercel.
-- Il vit donc en base, par fenêtres fixes. Seule la clé de service y accède (RLS sans politique, droits retirés).

create table if not exists public.api_rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 1,
  primary key (key, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

-- Compte un appel pour `p_key` dans la fenêtre courante et dit s'il reste sous la limite.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  integer;
begin
  insert into api_rate_limits (key, window_start) values (p_key, v_window)
  on conflict (key, window_start) do update set count = api_rate_limits.count + 1
  returning count into v_count;

  -- Ménage occasionnel des fenêtres passées.
  if random() < 0.02 then
    delete from api_rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
