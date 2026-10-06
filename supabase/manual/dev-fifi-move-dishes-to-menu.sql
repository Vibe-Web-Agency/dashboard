-- ═════════════════════════════════════════════════════════════════════════
--  DEV — FiFi : les plats quittent `services` pour la carte (`menu_items`)
--
--  `services` ne garde que ce qui se réserve (formules, brunch,
--  privatisation). Les deux lignes « À la carte » sont des plats :
--    • « Plat du jour » (16,50 €) n'existe pas sur la carte : il rejoint la
--      rubrique « Plats » ;
--    • « Bœuf bourguignon » existe déjà sur la carte (13,50 €) : la ligne de
--      la carte est gardée telle quelle, sa description n'est complétée que si
--      elle est vide. Le prix de la version `services` (29,90 €) n'est pas repris.
--  Aucune réservation ni aucun employé ne référence ces deux prestations.
--
--  Une seule transaction : tout passe, ou rien ne change.
--  Rejouable : relancé, il ne trouve plus rien à déplacer.
--  Appliqué sur la base de DEV le 2026-10-06.
-- ═════════════════════════════════════════════════════════════════════════

begin;

-- 1. Plats absents de la carte : ajoutés à la fin de « Plats ».
insert into public.menu_items (business_id, menu_section_id, name, description, price_cents, currency, image_url, is_available, position)
select s.business_id, sec.id, s.name, s.description, s.price_cents, s.currency, s.image_url, s.is_active,
       coalesce((select max(i.position) + 1 from public.menu_items i where i.menu_section_id = sec.id), 0)
  from public.services s
  join public.businesses b on b.id = s.business_id and b.slug = 'fifi'
  join public.menu_sections sec on sec.business_id = s.business_id and sec.name = 'Plats'
 where s.category = 'À la carte'
   and not exists (select 1 from public.menu_items i where i.business_id = s.business_id and lower(i.name) = lower(s.name));

-- 2. Plats déjà sur la carte : description complétée si vide.
update public.menu_items i
   set description = s.description, updated_at = now()
  from public.services s
  join public.businesses b on b.id = s.business_id and b.slug = 'fifi'
 where s.category = 'À la carte'
   and i.business_id = s.business_id and lower(i.name) = lower(s.name)
   and i.description is null and s.description is not null;

-- 3. Les plats sortent de `services` (non référencés : vérifié avant).
delete from public.services s
 using public.businesses b
 where b.id = s.business_id and b.slug = 'fifi'
   and s.category = 'À la carte'
   and not exists (select 1 from public.reservations r where r.service_id = s.id)
   and not exists (select 1 from public.employee_services e where e.service_id = s.id);

commit;

-- Contrôle.
select 'carte' as ou, sec.name as rubrique, i.name, i.price_cents, i.description
  from public.menu_items i join public.menu_sections sec on sec.id = i.menu_section_id
 where i.business_id = (select id from public.businesses where slug = 'fifi')
union all
select 'services', s.category, s.name, s.price_cents, s.description
  from public.services s
 where s.business_id = (select id from public.businesses where slug = 'fifi')
 order by 1, 2, 3;
