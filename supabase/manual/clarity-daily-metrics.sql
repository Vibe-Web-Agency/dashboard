-- Chiffres Microsoft Clarity par jour et par commerce. À rejouer sur chaque base V2, dont la production.
--
-- L'API d'export de Clarity ne donne que les 1 à 3 derniers jours et se limite à 10 appels par projet et par jour :
-- on relève donc les chiffres une fois par jour (cron) et on les garde ici.
--
-- Le jeton d'API de chaque projet est dans `business_integrations` (provider = 'clarity', account_id = identifiant
-- du projet, refresh_token = jeton), table réservée au serveur. Cette table-ci ne contient que des chiffres :
-- les membres du commerce la lisent (RLS), seule la clé de service y écrit.

create table if not exists public.clarity_daily_metrics (
  business_id uuid        not null references public.businesses(id) on delete cascade,
  date        date        not null,
  metrics     jsonb       not null,           -- chiffres normalisés (lib/v2/clarity.ts)
  raw         jsonb,                          -- réponse brute de l'API, pour pouvoir recalculer
  fetched_at  timestamptz not null default now(),
  primary key (business_id, date),
  constraint clarity_daily_metrics_metrics_check check (jsonb_typeof(metrics) = 'object')
);

alter table public.clarity_daily_metrics enable row level security;

drop policy if exists lecture on public.clarity_daily_metrics;
create policy lecture on public.clarity_daily_metrics for select to authenticated
  using (business_id in (select accessible_business_ids('viewer')));

revoke all on public.clarity_daily_metrics from anon;
revoke insert, update, delete, truncate on public.clarity_daily_metrics from authenticated;
