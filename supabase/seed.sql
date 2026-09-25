-- ═════════════════════════════════════════════════════════════════════════
--  Données FICTIVES pour la base de dev — rejouées par `npm run db:reset`.
--
--  ⚠️ Ne jamais copier la production ici : elle contient de vraies
--  coordonnées de clients finaux.
--
--  Les comptes de connexion ne sont PAS créés ici : ils se créent par
--  l'inscription ou par une invitation, ce qui permet de tester ce parcours.
-- ═════════════════════════════════════════════════════════════════════════

-- Deux agences : la tienne, et celle de la bêta.
insert into agencies (id, name, slug, is_internal, status) values
  ('11111111-1111-1111-1111-111111111111', 'Vibe Web Agency', 'vwa',      true,  'active'),
  ('22222222-2222-2222-2222-222222222222', 'Agence Démo',     'demo',     false, 'trial');

-- FiFi est le vrai commerce, avec ses vraies coordonnées : elles sont
-- publiques (c'est ce qu'affiche le site), et un jeu de dev représentatif
-- attrape des bugs qu'un « Restaurant Démo » laisserait passer — un numéro
-- au format français, une fermeture après minuit, un service continu.
insert into businesses (id, agency_id, business_type_id, name, slug,
                        email, phone, website_url, social_links,
                        address_line, postal_code, city, country,
                        maps_url, timezone, description)
select '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', t.id,
       'FiFi — Bouillon & Brasserie', 'fifi',
       'fifirestaurantparis@gmail.com', '+33 9 51 28 34 18', 'https://www.fifibouillon.com',
       '{"instagram": "https://www.instagram.com/fifibouillonparis",
         "tiktok": "https://www.tiktok.com/@fifibouillon"}'::jsonb,
       '56B rue de Clichy', '75009', 'Paris', 'FR',
       'https://www.google.com/maps/search/?api=1&query=56B+rue+de+Clichy%2C+75009+Paris',
       'Europe/Paris',
       'Bouillon & brasserie dans le 9ᵉ arrondissement de Paris. La cuisine française de toujours, généreuse et à prix juste.'
from business_types t where t.slug = 'restaurant';

insert into businesses (id, agency_id, business_type_id, name, slug, city)
select '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', t.id,
       'Client de la Démo', 'client-demo', 'Lyon'
from business_types t where t.slug = 'barbershop';

-- Horaires réels de FiFi : service continu 7j/7 à partir de 11h, fermeture à
-- minuit du dimanche au jeudi et à 2h le vendredi et le samedi.
-- La fermeture antérieure à l'ouverture se lit comme le lendemain : c'est
-- exactement le cas que `close_time <= open_time` est censé couvrir, et il
-- n'était vérifié nulle part avec de vraies données.
insert into business_hours (business_id, day_of_week, open_time, close_time)
select '33333333-3333-3333-3333-333333333333', d, '11:00',
       case when d in (5, 6) then time '02:00' else time '00:00' end
from generate_series(1, 7) d;   -- 1 = lundi (isodow), 5 = vendredi, 6 = samedi

-- Plan PROVISOIRE, de dev uniquement : les vraies offres se définiront plus
-- tard depuis le back-office. Il donne tous les modules, pour pouvoir tout
-- tester sans se poser de question.
insert into plans (id, agency_id, slug, name, description, price_monthly_cents, is_public)
values ('99999999-9999-9999-9999-999999999999', null, 'dev', 'Plan de test',
        'Tous les modules — jeu de dev, à ne pas reprendre en production', 0, false);

insert into plan_modules (plan_id, module_id)
select '99999999-9999-9999-9999-999999999999', id from modules;

insert into plan_quotas (plan_id, meter, monthly_limit) values
  ('99999999-9999-9999-9999-999999999999', 'sms',        50),
  ('99999999-9999-9999-9999-999999999999', 'email',    1000),
  ('99999999-9999-9999-9999-999999999999', 'ai_credits', 50);

insert into business_plans (business_id, agency_id, plan_id) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '99999999-9999-9999-9999-999999999999');

-- Modules activés côté commerce (le droit ne suffit pas, il faut le choix)
insert into business_module_settings (business_id, module_id, is_enabled)
select '33333333-3333-3333-3333-333333333333', id, true from modules
where slug in ('reservations', 'menu', 'customers', 'reviews', 'analytics');

-- Quelques clients et réservations, aux noms inventés
insert into customers (id, business_id, full_name, email, phone, source) values
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Camille Martin', 'camille@exemple.fr', '06 00 00 00 01', 'reservation'),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Sofiane Berger', 'sofiane@exemple.fr', '06 00 00 00 02', 'reservation');

insert into reservations (business_id, customer_id, starts_at, party_size, status, source)
values
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', now() + interval '1 day',  2, 'confirmed', 'website'),
  ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', now() + interval '2 days', 4, 'confirmed', 'phone'),
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', now() - interval '7 days', 2, 'completed', 'website');

-- Une carte minimale
insert into menu_sections (id, business_id, name, position) values
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Entrées', 1),
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Plats',   2);

insert into menu_items (business_id, menu_section_id, name, price_cents, allergens) values
  ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'Œufs mayonnaise',   390, '{eggs}'),
  ('33333333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', 'Bœuf bourguignon', 1350, '{celery}');
