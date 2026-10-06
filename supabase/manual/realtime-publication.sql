-- ═════════════════════════════════════════════════════════════════════════
--  Realtime : publier les tables métier
--
--  La publication `supabase_realtime` ne contenait aucune table de `public` :
--  aucun événement `postgres_changes` n'était émis, et les listes et badges
--  du dashboard ne se mettaient jamais à jour en direct.
--
--  Realtime applique la RLS de chaque table aux abonnés authentifiés : un
--  utilisateur ne reçoit que les lignes qu'il a le droit de lire.
--
--  Rejouable : une table déjà publiée est ignorée.
--  Appliqué sur la base de DEV le 2026-10-06. À coller dans l'éditeur SQL de
--  Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['reservations', 'quotes', 'customers', 'reviews', 'orders'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Contrôle.
select tablename from pg_publication_tables
 where pubname = 'supabase_realtime' and schemaname = 'public'
 order by tablename;
