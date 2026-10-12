-- ═════════════════════════════════════════════════════════════════════════
--  Restaurants : plus de module « Prestations / Formules »
--
--  Décision du 2026-10-12 : pour un restaurant, le module `services`
--  (affiché « Formules ») est inutile ; la carte (`menu`) suffit. On le retire
--  des types restaurant, pizzeria et bar-pub :
--    • il sort de `business_type_modules`, donc il n'est plus allumé à la
--      création ni par sync-business-modules-from-type.sql ;
--    • il est éteint (`is_enabled = false`) pour les commerces existants de
--      ces types. `services` est un module de base : sans cela il resterait
--      accordé.
--  Les lignes de la table `services` ne sont PAS supprimées : elles sont
--  simplement masquées, et le module peut être rallumé.
--
--  Rejouable. Appliqué sur la base de DEV le 2026-10-12. À coller dans
--  l'éditeur SQL de Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

delete from public.business_type_modules btm
 using public.business_types bt, public.modules m
 where bt.id = btm.business_type_id and m.id = btm.module_id
   and m.slug = 'services'
   and bt.slug in ('restaurant', 'pizzeria', 'bar-pub');

update public.business_module_settings s
   set is_enabled = false, updated_at = now()
  from public.businesses b
  join public.business_types bt on bt.id = b.business_type_id,
       public.modules m
 where s.business_id = b.id and s.module_id = m.id
   and m.slug = 'services'
   and bt.slug in ('restaurant', 'pizzeria', 'bar-pub')
   and s.is_enabled;

-- Contrôle : commerces de ces types et état du module.
select b.name, bt.slug as type, s.is_enabled as services_allume,
       (select count(*) from public.services sv where sv.business_id = b.id) as lignes_conservees
  from public.businesses b
  join public.business_types bt on bt.id = b.business_type_id
  left join public.business_module_settings s
    on s.business_id = b.id and s.module_id = (select id from public.modules where slug = 'services')
 where bt.slug in ('restaurant', 'pizzeria', 'bar-pub')
 order by b.name;
