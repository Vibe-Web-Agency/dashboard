-- ═════════════════════════════════════════════════════════════════════════
--  Activer pour un commerce les modules prévus par son type
--
--  Un module n'est accessible (`enabled_modules`, `has_feature`) que s'il est
--  à la fois ACCORDÉ (is_core, plan actif ou option) et ACTIVÉ pour le
--  commerce (`business_module_settings.is_enabled`). Attribuer un plan ne
--  suffit donc pas : sans ligne activée, le module reste invisible.
--
--  Ce script crée ou réactive, pour le commerce visé, une ligne par module
--  listé dans `business_type_modules` pour son type. Il n'ajoute que : les
--  modules déjà activés en plus restent activés, rien n'est désactivé.
--  Rejouable sans effet supplémentaire.
--
--  Usage : remplacer le slug du commerce ci-dessous (2 occurrences).
--  Exécuté sur la base de DEV le 2026-10-06 pour « client-demo ».
-- ═════════════════════════════════════════════════════════════════════════

-- 1. Réactive les lignes existantes désactivées.
update public.business_module_settings s
   set is_enabled = true, updated_at = now()
  from public.businesses b
  join public.business_type_modules btm on btm.business_type_id = b.business_type_id
 where b.slug = 'client-demo'
   and s.business_id = b.id
   and s.module_id = btm.module_id
   and not s.is_enabled;

-- 2. Crée les lignes manquantes.
insert into public.business_module_settings (business_id, module_id, is_enabled)
select b.id, btm.module_id, true
  from public.businesses b
  join public.business_type_modules btm on btm.business_type_id = b.business_type_id
 where b.slug = 'client-demo'
   and not exists (
         select 1 from public.business_module_settings s
          where s.business_id = b.id and s.module_id = btm.module_id
       );

-- Contrôle : modules accessibles au commerce après synchronisation.
select m.slug
  from public.businesses b
  cross join lateral public.granted_module_ids(b.id) g
  join public.modules m on m.id = g
 where b.slug = 'client-demo'
 order by m.sort_order;
