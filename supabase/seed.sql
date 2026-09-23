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

insert into businesses (id, agency_id, business_type_id, name, slug, city, timezone, email, phone)
select '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', t.id,
       'FiFi Bouillon (démo)', 'fifi-demo', 'Paris', 'Europe/Paris', 'contact@exemple.fr', '01 23 45 67 89'
from business_types t where t.slug = 'restaurant';

insert into businesses (id, agency_id, business_type_id, name, slug, city)
select '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', t.id,
       'Client de la Démo', 'client-demo', 'Lyon'
from business_types t where t.slug = 'barbershop';

-- Service continu, 12h–23h du lundi au dimanche
insert into business_hours (business_id, day_of_week, open_time, close_time)
select '33333333-3333-3333-3333-333333333333', d, '12:00', '23:00' from generate_series(1, 7) d;

-- Plan « Pro » pour le restaurant de démo
insert into business_plans (business_id, agency_id, plan_id)
select '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', p.id
from plans p where p.agency_id is null and p.slug = 'pro';

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
