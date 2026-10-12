-- ═════════════════════════════════════════════════════════════════════════
--  RLS : récursion infinie sur memberships et accès aux commerces cassé
--
--  Constat du 2026-10-12 : toutes les pages du dashboard répondaient 500 avec
--    42P17 « infinite recursion detected in policy for relation "memberships" »
--  Depuis l'audit du 2026-10-06, un script a ajouté 126 politiques (noms en
--  anglais) par-dessus les politiques d'origine, et réécrit une fonction.
--
--  1. La politique memberships_agency_manage, posée SUR memberships, relit
--     memberships dans son USING : PostgreSQL boucle. Elle contenait aussi
--     « memberships_1.agency_id = memberships_1.agency_id », toujours vrai :
--     sans la récursion, tout administrateur d'une agence aurait pu modifier
--     les memberships de TOUTES les agences. Elle est supprimée ; les écritures
--     sur memberships repassent par les RPC (invite_member, change_member_role,
--     remove_member), qui portent les garde-fous (dernier owner, rang).
--
--  2. accessible_business_ids avait été réécrite :
--       • elle ne renvoyait plus les commerces des membres de niveau agence
--         (business_id NULL) — 3 owners d'agence ne voyaient plus rien ;
--       • elle attendait min_role = 'admin', alors que 16 politiques et
--         guard_business_columns l'appellent avec 'administrator' : pour ce
--         rôle elle ne renvoyait donc jamais rien.
--     La définition auditée le 2026-10-06 est rétablie.
--
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12.
--  Définitions remplacées, pour mémoire (retour arrière) :
--
--   create policy memberships_agency_manage on public.memberships for all to authenticated using ((EXISTS ( SELECT 1 FROM memberships memberships_1 WHERE ((memberships_1.profile_id = auth.uid()) AND (memberships_1.agency_id = memberships_1.agency_id) AND (memberships_1.role = ANY (ARRAY['owner'::text, 'administrator'::text])) AND (memberships_1.is_active = true)))));
--
--   CREATE OR REPLACE FUNCTION public.accessible_business_ids(min_role text DEFAULT 'viewer'::text)
--    RETURNS SETOF uuid
--    LANGUAGE sql
--    STABLE SECURITY DEFINER
--    SET search_path TO 'public'
--   AS $function$
--     SELECT m.business_id
--     FROM public.memberships m
--     WHERE m.profile_id = auth.uid()
--       AND m.is_active = TRUE
--       AND m.business_id IS NOT NULL
--       AND (
--         min_role = 'viewer' OR
--         (min_role = 'member' AND m.role IN ('member', 'administrator', 'owner')) OR
--         (min_role = 'admin'  AND m.role IN ('administrator', 'owner')) OR
--         (min_role = 'owner'  AND m.role = 'owner')
--       );
--   $function$
-- ═════════════════════════════════════════════════════════════════════════

drop policy if exists memberships_agency_manage on public.memberships;

CREATE OR REPLACE FUNCTION public.accessible_business_ids(min_role text DEFAULT 'viewer'::text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select business_id from memberships
   where profile_id = auth.uid() and business_id is not null and is_active
     and role_rank(role) >= role_rank(min_role)
  union
  select b.id from businesses b
   where b.agency_id in (select accessible_agency_ids(min_role))
$function$;

-- Contrôle : plus aucune politique de memberships ne relit memberships directement.
select policyname, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'memberships'
   and (qual ~* 'from\s+\(?memberships' or with_check ~* 'from\s+\(?memberships');
