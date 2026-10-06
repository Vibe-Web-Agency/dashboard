-- ═════════════════════════════════════════════════════════════════════════
--  business_types : séparer « comment on appelle les clients » et
--  « en quoi on compte une réservation »
--
--  `party_noun` portait deux sens à la fois : le nom des clients (client,
--  patient, élève…) pour la plupart des types, et l'unité du nombre de
--  personnes (couvert) pour restaurant et pizzeria. Le menu « Clients » ne
--  pouvait pas s'en servir sans afficher « Couverts » chez un restaurant, et
--  le dashboard affichait un champ « clients » sur chaque rendez-vous de
--  barbier.
--
--    • customer_noun : nom des clients dans l'interface (menus, titres).
--    • party_noun    : unité de `reservations.party_size` (couvert, joueur…),
--                      NULL quand le nombre de personnes n'a pas de sens.
--
--  Rejouable : chaque instruction donne le même résultat si on la relance.
--  Appliqué sur la base de DEV le 2026-10-06. À coller dans l'éditeur SQL de
--  Supabase pour la PRODUCTION.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.business_types
  add column if not exists customer_noun text not null default 'client';

comment on column public.business_types.customer_noun is
  'Nom des clients dans l''interface (client, patient, élève…), au singulier.';
comment on column public.business_types.party_noun is
  'Unité de reservations.party_size (couvert, joueur…), au singulier. NULL : pas de nombre de personnes.';

-- Nom des clients : repris de party_noun quand celui-ci désignait des personnes.
update public.business_types set customer_noun = 'prospect' where slug = 'consulting-agency';
update public.business_types set customer_noun = 'patient'  where slug in ('osteopath', 'psychologist');
update public.business_types set customer_noun = 'joueur'   where slug in ('escape-game', 'sports-court');
update public.business_types set customer_noun = 'membre'   where slug = 'fitness-gym';
update public.business_types set customer_noun = 'élève'    where slug = 'driving-school';
-- Tous les autres types gardent la valeur par défaut « client ».

-- Unité du nombre de personnes : uniquement là où elle a un sens.
update public.business_types set party_noun = 'couvert'  where slug in ('restaurant', 'pizzeria');
update public.business_types set party_noun = 'joueur'   where slug in ('escape-game', 'sports-court');
update public.business_types set party_noun = 'personne' where slug = 'coach';
update public.business_types set party_noun = null
 where slug not in ('restaurant', 'pizzeria', 'escape-game', 'sports-court', 'coach');

-- Contrôle : une ligne par type, à relire avant de valider.
select slug, booking_noun, customer_noun, party_noun
  from public.business_types
 order by slug;
