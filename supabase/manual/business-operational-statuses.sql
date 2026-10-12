-- ═════════════════════════════════════════════════════════════════════════
--  Statuts de commerce : « en service » ne veut plus dire seulement 'active'
--
--  businesses.status accepte désormais lead_demo, active_client, active,
--  suspended, churned, agency. Deux endroits testaient encore status = 'active' :
--    • granted_module_ids : un commerce lead_demo ou active_client n'avait
--      aucun module (dashboard réduit à trois entrées) ;
--    • businesses_public_widget_select : sa vitrine était invisible en anonyme.
--  (L'API publique du dashboard faisait la même erreur : corrigée dans le code,
--  lib/v2/statuses.ts → OPERATIONAL_BUSINESS_STATUSES.)
--
--  Sont « en service » : active, active_client, lead_demo. Une démo pour un
--  prospect doit fonctionner comme un vrai commerce. suspended et churned
--  restent coupés. 'agency' n'est porté par aucun commerce aujourd'hui : il
--  reste hors service tant que son sens n'est pas défini.
--
--  La liste vit dans une seule fonction : business_is_operational(status).
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12. À coller dans
--  l'éditeur SQL de Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

create or replace function public.business_is_operational(p_status text)
 returns boolean
 language sql
 immutable
 set search_path to 'public'
as $function$
  select p_status in ('active', 'active_client', 'lead_demo')
$function$;

comment on function public.business_is_operational(text) is
  'Un commerce à ce statut est-il en service (modules accessibles, vitrine publique, ingestion) ?';

create or replace function public.granted_module_ids(p_business uuid)
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select m.id
    from modules m
    join business_module_settings s
      on s.module_id = m.id
     and s.business_id = p_business
     and s.is_enabled
   where m.is_active
     and exists (select 1 from businesses where id = p_business and business_is_operational(status))
     and (
       m.is_core
       or exists (select 1 from business_plans bp
                    join plan_modules pm on pm.plan_id = bp.plan_id
                   where bp.business_id = p_business
                     and bp.status in ('trialing', 'active', 'past_due')
                     and pm.module_id = m.id)
       or exists (select 1 from business_addons a
                   where a.business_id = p_business and a.status = 'active'
                     and a.module_id = m.id)
     )
$function$;

drop policy if exists businesses_public_widget_select on public.businesses;
create policy businesses_public_widget_select on public.businesses
  for select to anon
  using (public.business_is_operational(status));

-- Contrôle : modules accessibles par commerce.
select b.name, b.status, count(g) as modules_accessibles
  from public.businesses b
  left join lateral public.granted_module_ids(b.id) g on true
 group by b.name, b.status
 order by b.name;
