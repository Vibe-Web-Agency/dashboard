-- ═════════════════════════════════════════════════════════════════════════
--  DEV — le plan « Pro » de Vibe Web Agency n'accordait aucun module
--
--  Depuis la création des plans par agence (2026-10-06 15:32), FiFi est
--  abonnée au « Pro » de Vibe Web Agency (…0012), qui ne contenait aucune
--  ligne dans `plan_modules`. FiFi n'avait plus droit qu'aux modules de base :
--  Réservations et Carte avaient disparu du dashboard.
--
--  Correction immédiate : ce plan reçoit les mêmes modules que le « Pro » de
--  l'Agence Démo (…0002). À remplacer par des plans communs à toutes les
--  agences si cette option est retenue.
--
--  Rejouable : un module déjà présent est ignoré.
--  Appliqué sur la base de DEV le 2026-10-06.
-- ═════════════════════════════════════════════════════════════════════════

insert into public.plan_modules (plan_id, module_id)
select '10000000-0000-0000-0000-000000000012', pm.module_id
  from public.plan_modules pm
 where pm.plan_id = '10000000-0000-0000-0000-000000000002'
   and not exists (
         select 1 from public.plan_modules x
          where x.plan_id = '10000000-0000-0000-0000-000000000012' and x.module_id = pm.module_id
       );

-- Contrôle : modules accessibles à FiFi.
select m.slug
  from public.businesses b
  cross join lateral public.granted_module_ids(b.id) g
  join public.modules m on m.id = g
 where b.slug = 'fifi'
 order by m.sort_order;
