-- ═════════════════════════════════════════════════════════════════════════
--  Données de référence : métiers et catalogue des modules
--
--  Ce ne sont PAS des données de test : elles existeront aussi en production.
--  Le catalogue est repris des fonctionnalités qui existent réellement
--  aujourd'hui ; les coquilles (fidélité, cartes cadeaux, WhatsApp…) en sont
--  volontairement absentes, elles seront ajoutées quand elles seront construites.
--
--  Les métiers et les modules sont STRUCTURELS : sans eux, has_feature ne
--  répond rien et aucune fonctionnalité ne s'active. Les plans, eux, sont
--  commerciaux : ils se définissent plus tard, depuis le back-office.
-- ═════════════════════════════════════════════════════════════════════════

insert into business_types (slug, label, booking_noun) values
  ('restaurant',  'Restaurant / Bar',    'réservation'),
  ('barbershop',  'Coiffeur / Barbier',  'rendez-vous'),
  ('coach',       'Coach / Praticien',   'séance'),
  ('ecommerce',   'Boutique en ligne',   'commande'),
  ('agency',      'Agence créative',     'rendez-vous'),
  ('modeling',    'Agence de mannequins','casting');

insert into modules (slug, label, category, is_core, sort_order, description) values
  ('reservations',   'Réservations',        'activity',      false, 10, 'Prise de réservation en ligne et en salle'),
  ('reminders',      'Rappels',             'communication', false, 20, 'Rappel automatique par SMS ou e-mail avant le rendez-vous'),
  ('customers',      'Fichier clients',     'activity',      true,  30, 'Fiches clients, historique et notes'),
  ('shop',           'Boutique',            'activity',      false, 40, 'Produits, variantes et commandes'),
  ('quotes',         'Devis',               'activity',      false, 50, 'Demandes et devis chiffrés'),
  ('invoicing',      'Facturation',         'module',        false, 60, 'Factures et avoirs conformes'),
  ('reviews',        'Avis',                'visibility',    false, 70, 'Collecte et modération des avis'),
  ('google_reviews', 'Réponses aux avis',   'visibility',    false, 80, 'Réponse automatique aux avis Google'),
  ('blog',           'Blog',                'content',       false, 90, 'Articles publiés sur le site'),
  ('services',       'Prestations',         'content',       true, 100, 'Catalogue de prestations'),
  ('menu',           'Carte',               'content',      false, 110, 'Carte du restaurant, modifiable en ligne'),
  ('projects',       'Réalisations',        'content',      false, 120, 'Projets mis en avant sur le site'),
  ('talents',        'Talents',             'content',      false, 130, 'Profils représentés par une agence'),
  ('campaigns',      'Campagnes',           'communication', false, 140, 'Campagnes e-mail et SMS'),
  ('inbox',          'Messagerie',          'communication', false, 150, 'Conversations clients (Instagram, WhatsApp…)'),
  ('planning',       'Planning',            'module',        false, 160, 'Équipe, créneaux, congés'),
  ('analytics',      'Statistiques',        'visibility',    true,  170, 'Visites et fréquentation du site');

-- Modules proposés selon le métier (ce que l'agence voit en premier)
insert into business_type_modules (business_type_id, module_id)
select t.id, m.id from business_types t join modules m on true
where (t.slug = 'restaurant' and m.slug in ('reservations','reminders','menu','reviews','google_reviews','campaigns','inbox'))
   or (t.slug = 'barbershop' and m.slug in ('reservations','reminders','reviews','google_reviews','campaigns','planning'))
   or (t.slug = 'coach'      and m.slug in ('reservations','reminders','quotes','invoicing','campaigns'))
   or (t.slug = 'ecommerce'  and m.slug in ('shop','invoicing','reviews','campaigns','blog'))
   or (t.slug = 'agency'     and m.slug in ('projects','quotes','invoicing','blog','inbox'))
   or (t.slug = 'modeling'   and m.slug in ('talents','projects','quotes','inbox'));

-- Les PLANS ne sont pas ici : ce sont des décisions commerciales, pas des
-- données structurelles. Ils se créeront depuis le back-office, et se
-- modifieront par un simple `update` — jamais par une migration.
-- Un plan provisoire existe dans supabase/seed.sql, pour la base de dev.
