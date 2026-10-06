-- ═════════════════════════════════════════════════════════════════════════
--  business_types.service_noun : nom de ce qu'on réserve dans `services`
--
--  Décision du 2026-10-06 : `services` = ce qui est RÉSERVABLE (formules,
--  brunch, privatisation, coupe, soin…), `menu` = la carte (plats, boissons,
--  non réservables). Le module s'affiche sous le nom adapté au métier :
--  « Formules » pour la restauration, « Soins » pour un institut,
--  « Prestations » par défaut.
--
--  Au singulier, comme booking_noun et customer_noun.
--  Rejouable. Appliqué sur la base de DEV le 2026-10-06. À coller dans
--  l'éditeur SQL de Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.business_types
  add column if not exists service_noun text not null default 'prestation';

comment on column public.business_types.service_noun is
  'Nom de ce qu''on réserve (table services) dans l''interface : formule, prestation, soin… Au singulier.';

update public.business_types set service_noun = 'formule'
 where slug in ('restaurant', 'pizzeria', 'bar-pub', 'caterer', 'food-truck');
update public.business_types set service_noun = 'soin'
 where slug in ('beauty-institute', 'spa-massage');
-- Tous les autres types gardent « prestation ».

select slug, booking_noun, service_noun, customer_noun, party_noun
  from public.business_types
 order by slug;
