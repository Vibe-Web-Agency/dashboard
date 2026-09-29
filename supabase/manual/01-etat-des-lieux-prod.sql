-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAT DES LIEUX DE LA PRODUCTION — lecture seule, UNE seule requête
--
-- À lancer dans l'éditeur SQL de Supabase, sur le projet de PRODUCTION
-- (ibqjwlpqqgutdjhjlyrq). Copier le résultat — une seule cellule JSON — et
-- me le coller.
--
-- Une seule requête, volontairement : l'éditeur Supabase n'affiche que le
-- résultat du DERNIER `select` d'un script. La version précédente en
-- enchaînait six et ne montrait donc que le sixième.
--
-- Il ne lit AUCUNE donnée client : structure des tables, état de RLS,
-- politiques et privilèges. Aucun nom, aucun téléphone, aucune réservation
-- n'en sort. Seuls des COMPTAGES de lignes apparaissent, pour mesurer
-- l'ampleur de ce qui est exposé.
-- ─────────────────────────────────────────────────────────────────────────

select jsonb_pretty(jsonb_build_object(

  'tables', (
    select jsonb_agg(t order by t->>'table')
    from (
      select jsonb_build_object(
        'table',      c.relname,
        'rls',        c.relrowsecurity,
        'politiques', (select count(*) from pg_policies p
                        where p.schemaname = 'public' and p.tablename = c.relname),
        'lignes',     (select n_live_tup from pg_stat_user_tables s
                        where s.relname = c.relname and s.schemaname = 'public'),
        'anon',       coalesce((
                        select string_agg(distinct lower(g.privilege_type), ',' order by lower(g.privilege_type))
                        from information_schema.role_table_grants g
                        where g.table_schema = 'public'
                          and g.table_name = c.relname
                          and g.grantee = 'anon'
                      ), '—'),
        'colonnes',   (select string_agg(col.column_name || ':' || col.data_type, ', '
                                         order by col.ordinal_position)
                        from information_schema.columns col
                        where col.table_schema = 'public' and col.table_name = c.relname)
      ) as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ) x
  ),

  'politiques', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tablename, 'nom', policyname, 'commande', cmd,
      'roles', roles::text, 'using', qual, 'with_check', with_check
    ) order by tablename, policyname)
    from pg_policies where schemaname = 'public'
  ), '[]'::jsonb),

  'fonctions', coalesce((
    select jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
                     order by p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ), '[]'::jsonb),

  'vues', coalesce((
    select jsonb_agg(c.relname order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  ), '[]'::jsonb)

)) as etat_des_lieux;
