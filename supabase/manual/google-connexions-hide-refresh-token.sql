-- ═════════════════════════════════════════════════════════════════════════
--  google_connexions : le jeton de rafraîchissement n'est plus lisible
--
--  La table porte refresh_token (accès au compte Google Business Profile du
--  commerce). La politique google_connexions_member_manage (ALL) laissait tout
--  membre le lire directement dans la table, en contournant la vue censée le
--  masquer.
--
--  Solution :
--    • la table est fermée aux rôles anon et authenticated : plus aucun droit,
--      plus aucune politique. Seul le serveur (clé de service) la lit et
--      l'écrit, pendant la connexion OAuth et les synchronisations ;
--    • la vue v_google_connections_status reste le seul accès côté dashboard.
--      Elle s'exécute avec les droits de son propriétaire (security_invoker =
--      false) et filtre elle-même sur accessible_business_ids('viewer') :
--      un membre voit l'état de la connexion de SES commerces (connecté ou
--      non, dernière synchro, dernière erreur), jamais le jeton.
--
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12. À coller dans
--  l'éditeur SQL de Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

drop policy if exists google_connexions_member_manage on public.google_connexions;
drop policy if exists google_connexions_platform_admin_all on public.google_connexions;
revoke all on public.google_connexions from anon, authenticated;

create or replace view public.v_google_connections_status with (security_invoker = false) as
SELECT business_id,
    agency_id,
    account_id,
    location_id,
    scopes,
    connecte_par,
    connecte_le,
    derniere_synchro,
    derniere_erreur,
    created_at,
    updated_at,
    refresh_token IS NOT NULL AS is_connected,
        CASE
            WHEN refresh_token IS NULL THEN 'disconnected'::text
            WHEN derniere_erreur IS NOT NULL THEN 'error'::text
            ELSE 'active'::text
        END AS sync_status
   FROM google_connexions gc
  WHERE gc.business_id IN ( SELECT public.accessible_business_ids('viewer'::text) AS accessible_business_ids);

revoke all on public.v_google_connections_status from anon, authenticated;
grant select on public.v_google_connections_status to authenticated;

-- Contrôle : politiques restantes sur la table, droits des rôles clients.
select 'politique sur google_connexions' as quoi, policyname as valeur from pg_policies where schemaname = 'public' and tablename = 'google_connexions'
union all
select 'droit ' || grantee || ' sur ' || table_name, string_agg(privilege_type, ',')
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name in ('google_connexions', 'v_google_connections_status') and grantee in ('anon', 'authenticated')
 group by grantee, table_name;
